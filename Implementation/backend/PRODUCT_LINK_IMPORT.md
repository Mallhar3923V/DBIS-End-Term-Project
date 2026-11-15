# PriceSense — Product-link import (beta)

This extends the **existing PriceSense GitHub project**. It does not modify any SQL schema,
stored procedures, triggers, views, or transaction definitions.

## What it does

When a user pastes an HTTPS Amazon India or Flipkart product URL, the Python
backend tries to read the product's publicly exposed title and INR price.
If a matching listing is already saved, it records a new dated price
observation. Otherwise it inserts a product, store listing, and observation
in the existing tables.

- **Only observed price data is saved.** No invented price history or
  comparisons with stores that were not actually checked.
- A just-imported product starts with **one history observation**, not 90 days
  of historical prices. Later successful fetches can build history.
- Amazon `amzn.in` share links are resolved through HTTP redirects first.
- A previously cached listing may still be shown if the retailer stops
  responding; the frontend labels it as a stored price, NOT a live quote.

**Limitation:** Retailers may block automated requests, change HTML layouts,
or omit structured pricing metadata. Amazon and Flipkart do not guarantee
that a freely accessible product page will expose an importable price.
For dependable high-volume coverage, use a permitted product-data API with
the necessary account credentials and terms of use. The beta importer
does NOT promise successful retrieval for arbitrary products.

## Beginner-friendly database flow

No advanced SQL is required:

1. `SELECT` — check for an existing `store_listing` by retailer product ID
2. `INSERT` — if needed, create a `product` and `store_listing`
3. `INSERT` — record the observed price in `price_history`
4. Existing `trg_sync_listing_price` trigger updates the listing's current price
5. Existing `trg_check_price_alerts` trigger checks price-drop alerts
6. Existing FastAPI database connection commits the request, and rolls
   back when MySQL reports an error

The existing database tables and trigger SQL are unchanged.

## Run locally

1. **Backup existing MySQL data first.** The repo's
   `database/01_schema.sql` starts by dropping the database; do not
   rerun it against data you need to preserve.
2. Open a PowerShell terminal in `Implementation/backend`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Start MySQL and the original backend:
   `uvicorn main:app --reload --port 8000`.
5. Start the existing frontend in `Implementation/frontend`:
   `python -m http.server 5173`, then browse `http://localhost:5173`.
6. Paste an Amazon/Flipkart product link in the search field.

API endpoints:

- `GET /api/products/by-link?url=<encoded-url>`: search existing listings
- `POST /api/products/import-by-link?url=<encoded-url>`: attempt a NEW observation
- `GET /api/products/<id>`: stored product and store comparison
- `GET /api/products/<id>/price-history?days=365`: actual recorded observations

For testing the local beta endpoint from PowerShell:

```powershell
$url = [uri]::EscapeDataString("https://www.amazon.in/dp/B0ABCDE123")
Invoke-RestMethod -Method Post "http://localhost:8000/api/products/import-by-link?url=$url"
```

The example ASIN is deliberately illustrative and may not exist. Use a
real URL provided by the retailer when testing.

To run the offline parser tests:

```powershell
cd Implementation/backend
python -m unittest -v test_product_import.py
```

## Must verify before merging

- MySQL connection is live and the initial catalog loads.
- An accessible real product URL returns **real title + INR price**.
- A blocked page returns a clear error **without creating any rows**.
- Repeating a successful import does not create duplicate product listings.
- On a genuinely changed recorded price, the existing triggers synchronize
  `store_listing.current_price` and check active alerts.
- Price-history chart displays only recorded dates and observations.
- Validate any pricing with the retailer; website metadata can be stale.
- Multi-store comparison only includes stored listings for the SAME product;
  an unfamiliar product may initially have only one verified store.
- Test with the exact `https://amzn.in/d/0bJraCSi` share link. This has not
  been verified live and may still be blocked.

## Security / deployment note

This importer is intended for **local student demos**. The import endpoint is
not authenticated or rate-limited, and the existing backend allows broad CORS.
Do not deploy the importer to a public server without adding authentication,
rate limits, timeouts/monitoring, and reviewing retailer data-usage rules.
