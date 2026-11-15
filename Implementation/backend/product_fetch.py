"""Best-effort public product metadata import for the existing PriceSense database.

No CAPTCHA bypass, proxy rotation, or fabricated prices. Sites can block requests.
For reliable coverage, replace this fetcher with an authorized retailer-data API.
"""
import json
import re
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, build_opener

from product_links import NoRedirect, ProductLinkError, check_link, lookup_identity, resolve_link


class MerchantDataUnavailable(Exception):
    """The retailer did not provide enough publicly readable product data."""


class PageMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.json_scripts = []
        self._json = False
        self._chunks = []
        self._in_title = False
        self.title_parts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            key = (a.get("property") or a.get("name") or a.get("itemprop") or "").lower()
            if key and a.get("content"):
                self.meta[key] = a["content"].strip()
        if tag == "script" and a.get("type", "").lower().startswith("application/ld+json"):
            self._json = True
            self._chunks = []
        if tag == "title":
            self._in_title = True

    def handle_data(self, data):
        if self._json:
            self._chunks.append(data)
        if self._in_title:
            self.title_parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._json:
            self.json_scripts.append("".join(self._chunks))
            self._chunks = []
            self._json = False
        if tag == "title":
            self._in_title = False


def _find_product(node, depth=0):
    if depth > 8:
        return None
    if isinstance(node, list):
        for part in node:
            result = _find_product(part, depth + 1)
            if result:
                return result
    if isinstance(node, dict):
        types = node.get("@type", [])
        if isinstance(types, str):
            types = [types]
        if any(t.split("/")[-1].lower() == "product" for t in types if isinstance(t, str)):
            return node
        for key in ("@graph", "mainEntity", "itemListElement"):
            if key in node:
                result = _find_product(node[key], depth + 1)
                if result:
                    return result
    return None


def _positive_inr(value, currency):
    if str(currency).upper().strip() != "INR":
        return None
    try:
        amount = Decimal(str(value).replace(",", "").replace("₹", "").strip())
        if amount.is_finite() and Decimal("0") < amount <= Decimal("10000000"):
            return amount.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        pass
    return None


def _price_in_offers(offers):
    if isinstance(offers, list):
        for offer in offers:
            price = _price_in_offers(offer)
            if price:
                return price
        return None
    if not isinstance(offers, dict):
        return None

    currency = offers.get("priceCurrency")
    price = _positive_inr(offers.get("price", offers.get("lowPrice")), currency)
    if price:
        return price
    details = offers.get("priceSpecification")
    if details:
        return _price_in_offers(details)
    return None


def parse_product_html(html):
    """Return trustworthy title + INR price or raise a clear error."""
    page = PageMetadata()
    page.feed(html)
    product = None
    for script in page.json_scripts:
        try:
            product = _find_product(json.loads(script))
        except (ValueError, TypeError):
            continue
        if product:
            break

    title = (product or {}).get("name") or page.meta.get("og:title") or ""
    if not isinstance(title, str) or not title.strip():
        raise MerchantDataUnavailable("This retailer page did not expose a product title.")

    price = _price_in_offers((product or {}).get("offers"))
    if price is None:
        price = _positive_inr(
            page.meta.get("product:price:amount", page.meta.get("price")),
            page.meta.get("product:price:currency", page.meta.get("pricecurrency")),
        )
    if price is None:
        raise MerchantDataUnavailable("A verified INR product price was not available. No data was saved.")

    brand = (product or {}).get("brand")
    if isinstance(brand, dict):
        brand = brand.get("name")
    if not isinstance(brand, str) or not brand.strip():
        brand = "Unspecified"

    description = (product or {}).get("description") or page.meta.get("og:description") or ""
    if not isinstance(description, str):
        description = ""

    availability = "IN_STOCK"
    offers = (product or {}).get("offers")
    first_offer = offers[0] if isinstance(offers, list) and offers else offers
    if isinstance(first_offer, dict):
        status = str(first_offer.get("availability", "")).lower()
        if status.endswith("outofstock"):
            availability = "OUT_OF_STOCK"

    return {
        "title": " ".join(title.split())[:255],
        "brand": " ".join(brand.split())[:100],
        "description": " ".join(description.split())[:2000],
        "price": price,
        "availability": availability,
    }


def _fetch_html(url):
    """Read at most 2MB, checking the hostname on every HTTP redirect."""
    opener = build_opener(NoRedirect)
    current = url
    for _ in range(5):
        check_link(current)  # No user-supplied or redirect-to-internal network addresses
        req = Request(
            current,
            headers={"User-Agent": "PriceSenseStudentProject/1.0", "Accept": "text/html"},
            method="GET",
        )
        try:
            with opener.open(req, timeout=7) as response:
                kind = response.headers.get("Content-Type", "").lower()
                if "html" not in kind:
                    raise MerchantDataUnavailable("The retailer did not return an HTML product page.")
                raw = response.read(2_000_001)
                if len(raw) > 2_000_000:
                    raise MerchantDataUnavailable("Retailer page was too large to read safely.")
                return raw.decode("utf-8", errors="replace")
        except HTTPError as exc:
            if exc.code in (301, 302, 303, 307, 308) and exc.headers.get("Location"):
                current = urljoin(current, exc.headers["Location"])
                continue
            raise MerchantDataUnavailable(
                "Retailer blocked or rejected automated product retrieval (HTTP %s)." % exc.code
            ) from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise MerchantDataUnavailable("Could not reach the retailer product page.") from exc

    raise MerchantDataUnavailable("Too many retailer redirects.")


def fetch_public_product(url):
    """Resolve link and fetch publicly exposed metadata; return import-ready data."""
    try:
        resolved = resolve_link(url)
        store_id, _clean, product_code = lookup_identity(resolved)
    except ProductLinkError as exc:
        raise MerchantDataUnavailable(str(exc)) from exc

    if not product_code:
        raise MerchantDataUnavailable("Could not identify the retailer's product ID.")

    # Avoid tracking parameters on Amazon pages; Flipkart needs its product PID query.
    fetch_url = "https://www.amazon.in/dp/" + product_code if store_id == 1 else resolved
    html = _fetch_html(fetch_url)
    if any(token in html.lower() for token in ("validatecaptcha", "robot check", "enter the characters you see below")):
        raise MerchantDataUnavailable("Retailer requested human verification, so automatic import is unavailable.")

    data = parse_product_html(html)
    data.update({
        "store_id": store_id,
        "store_product_id": product_code,
        "product_url": fetch_url[:500],
    })
    return data
