"""Validate supported product links and resolve Amazon's short share URLs.

This module only identifies products. It does NOT scrape store prices.
Redirects are followed manually and ONLY to allowlisted HTTPS store hosts.
"""

import re
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


AMAZON_HOSTS = {"amazon.in", "www.amazon.in"}
AMAZON_SHORT_HOSTS = {"amzn.in", "www.amzn.in"}
FLIPKART_HOSTS = {"flipkart.com", "www.flipkart.com"}
ALLOWED_HOSTS = AMAZON_HOSTS | AMAZON_SHORT_HOSTS | FLIPKART_HOSTS


class ProductLinkError(ValueError):
    """An unsupported, blocked, or unresolvable merchant link."""


def check_link(url):
    """Return parsed HTTPS URL only for supported merchant hostnames."""
    if not isinstance(url, str) or len(url) > 2048:
        raise ProductLinkError("Product link is too long.")
    try:
        parsed = urlsplit(url.strip())
        unsafe_port = parsed.port not in (None, 443)
        has_credentials = parsed.username is not None or parsed.password is not None
    except ValueError as exc:
        raise ProductLinkError("Malformed retailer URL.") from exc
    if (
        parsed.scheme.lower() != "https"
        or parsed.hostname not in ALLOWED_HOSTS
        or has_credentials
        or unsafe_port
    ):
        raise ProductLinkError("Only HTTPS Amazon India and Flipkart links are supported.")
    return parsed


class NoRedirect(HTTPRedirectHandler):
    """Never follow a Location header without checking the destination."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def resolve_link(url):
    """Resolve amzn.in share links to their Amazon URL, with a safety allowlist."""
    current = url.strip()
    parsed = check_link(current)
    if parsed.hostname not in AMAZON_SHORT_HOSTS:
        return current

    opener = build_opener(NoRedirect)
    for _ in range(5):
        parsed = check_link(current)
        if parsed.hostname not in AMAZON_SHORT_HOSTS:
            if parsed.hostname not in AMAZON_HOSTS:
                raise ProductLinkError("Amazon share link did not lead to amazon.in.")
            return current

        request = Request(current, method="HEAD", headers={"User-Agent": "PriceSense/1.0"})
        try:
            with opener.open(request, timeout=5) as response:
                location = response.headers.get("Location")
        except HTTPError as exc:
            if exc.code not in (301, 302, 303, 307, 308):
                raise ProductLinkError("Amazon did not allow the short link to be resolved.") from exc
            location = exc.headers.get("Location")
        except (URLError, TimeoutError, OSError) as exc:
            raise ProductLinkError("Could not reach Amazon's short link service.") from exc

        if not location:
            raise ProductLinkError("Amazon share link did not return a destination.")
        current = urljoin(current, location)
        # Prevent redirects to local/private/internal or unrelated URLs.
        check_link(current)

    raise ProductLinkError("Too many Amazon short-link redirects.")


def lookup_identity(url):
    """Return (store_id, clean_url, store_product_id) for catalog lookup.

    Uses store IDs in this project's existing 03_seed_data.sql:
    1 = Amazon India; 2 = Flipkart.
    """
    resolved = resolve_link(url)
    parsed = check_link(resolved)
    clean_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", ""))

    if parsed.hostname in AMAZON_HOSTS:
        match = re.search(r"/(?:dp|gp/product|gp/aw/d)/([A-Za-z0-9]{10})(?:/|$)", parsed.path, re.I)
        return 1, clean_url, match.group(1).upper() if match else ""

    if parsed.hostname in FLIPKART_HOSTS:
        product_id = parse_qs(parsed.query).get("pid", [""])[0]
        return 2, clean_url, product_id[:100]

    raise ProductLinkError("This shopping website is not supported yet.")
