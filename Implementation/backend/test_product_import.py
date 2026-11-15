"""Offline tests: python -m unittest -v test_product_import.py

No retailer network access, MySQL, or paid API key is needed.
"""
import unittest
from decimal import Decimal

from product_fetch import MerchantDataUnavailable, parse_product_html
from product_links import ProductLinkError, check_link, lookup_identity


class ProductImportTests(unittest.TestCase):
    def test_jsonld_product_price_and_brand(self):
        html = """
        <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product",
         "name":"Example Headphones","brand":{"name":"Example"},
         "offers":{"@type":"Offer","price":"1999.00","priceCurrency":"INR"}}
        </script>
        """
        result = parse_product_html(html)
        self.assertEqual(result["title"], "Example Headphones")
        self.assertEqual(result["brand"], "Example")
        self.assertEqual(result["price"], Decimal("1999.00"))

    def test_amazon_product_title_and_primary_price(self):
        html = """
        <span id="productTitle">Example Monitor</span>
        <div id="corePriceDisplay_desktop_feature_div">
           <span class="a-offscreen">₹12,499.00</span>
        </div>
        """
        result = parse_product_html(html)
        self.assertEqual(result["title"], "Example Monitor")
        self.assertEqual(result["price"], Decimal("12499.00"))

    def test_reject_price_from_unrelated_product_recommendation(self):
        html = """
        <meta property="og:title" content="Example Product">
        <aside>Other item: <span class="a-offscreen">₹2,999</span></aside>
        """
        with self.assertRaises(MerchantDataUnavailable):
            parse_product_html(html)

    def test_reject_non_inr_offer(self):
        html = """
        <script type="application/ld+json">
        {"@type":"Product","name":"Example Book",
         "offers":{"price":"59","priceCurrency":"USD"}}
        </script>
        """
        with self.assertRaises(MerchantDataUnavailable):
            parse_product_html(html)

    def test_amazon_asin_from_normal_url(self):
        store_id, _url, code = lookup_identity("https://www.amazon.in/dp/B0ABCDE123?tag=test")
        self.assertEqual((store_id, code), (1, "B0ABCDE123"))

    def test_flipkart_pid(self):
        store_id, _url, code = lookup_identity(
            "https://www.flipkart.com/example/p/itm123?pid=MOBEXAMPLE"
        )
        self.assertEqual((store_id, code), (2, "MOBEXAMPLE"))

    def test_block_unsupported_or_private_link(self):
        for url in (
            "https://127.0.0.1/product",
            "http://www.amazon.in/dp/B0ABCDE123",
            "https://amazon.in.evil.example/dp/B0ABCDE123",
            "https://user@www.amazon.in/dp/B0ABCDE123",
        ):
            with self.subTest(url=url), self.assertRaises(ProductLinkError):
                check_link(url)


if __name__ == "__main__":
    unittest.main()
