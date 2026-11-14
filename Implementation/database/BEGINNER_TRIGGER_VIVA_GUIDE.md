# PriceSense — Beginner-friendly DBIS trigger and viva guide

This guide follows the **CS257 October 2026 MySQL 8 Triggers tutorial**. It explains the real project's two triggers without changing their business logic.

> **Safety:** Work on the evaluation branch. Do not re-run `01_schema.sql` against a database containing data you need: it starts with `DROP DATABASE IF EXISTS`. Back up your database first. The SQL tests below use `ROLLBACK` and require InnoDB tables.

## 1. How the application is connected

```text
Frontend (HTML/CSS/JavaScript)
      |
      | fetch GET /api/products and related routes
      v
Python FastAPI backend (routers/*.py)
      |
      | mysql.connector; SQL queries / CALL stored procedures
      v
MySQL price_comparison_db
      |
      +--> price_history INSERT
      |      |
      |      +--> trg_sync_listing_price (AFTER INSERT)
      |                 |
      |                 +--> store_listing UPDATE
      |                            |
      |                            +--> trg_check_price_alerts (AFTER UPDATE)
      |                                       |
      |                                       +--> price_alert UPDATE
      |
      +--> Views: current_best_prices, product_price_summary,
                 v_offer, v_active_offers, v_store_comparison,
                 v_deal_intelligence
```

**Important:** The frontend has a sample-data fallback. A visually working page does not prove MySQL was involved. The saved-heart watchlist in `frontend/script.js` currently uses browser `localStorage`, not the backend `watches` table. Admin simulator and alert API exist in the backend, but the split frontend does not implement those API flows.

## 2. Table cheat sheet

| Table | Purpose | Important keys/columns |
| --- | --- | --- |
| category | Category hierarchy | category_id (PK), parent_category_id (self FK) |
| product | Product catalog | product_id (PK), category_id (FK) |
| product_spec | Product specifications | (product_id, spec_name) composite PK |
| store | Stores | store_id (PK) |
| store_listing | One listing for a product in a store | listing_id (PK), product_id (FK), store_id (FK), current_price, last_updated |
| price_history | Historical observations | (listing_id, recorded_timestamp) composite PK, price |
| offer | Offer common details | offer_id (PK), listing_id (FK), offer_type |
| coupon_offer | Coupon-specific fields | offer_id (PK/FK), coupon_code, discount_value |
| discount_offer | Discount-specific fields | offer_id (PK/FK), discount_percent |
| cashback_offer | Cashback-specific fields | offer_id (PK/FK), cashback_amount |
| users | Accounts and roles | user_id (PK), email (UNIQUE), password_hash |
| price_alert | Price thresholds for users | alert_id (PK), user_id (FK), product_id (FK), target_price, alert_status |
| watches | User-product watchlist | (user_id, product_id) composite PK |

**Schema fact:** `store_listing` has `UNIQUE(product_id, store_id)`, and `price_history` stores many dated prices for each listing. `watches` models many-to-many users and products.

## 3. Trigger 1 — sync the current price

**File:** `database/02_triggers_views_procedures.sql`  
**Trigger:** `trg_sync_listing_price` — `AFTER INSERT ON price_history`

When a new history row is inserted, `NEW.listing_id` identifies the listing, `NEW.price` supplies the new current price, and `NEW.recorded_timestamp` supplies the update time. Only update the listing if its stored timestamp is not newer than the incoming observation.

**Why preserve `AND last_updated <= NEW.recorded_timestamp`?** Without it, inserting older historical data later could incorrectly replace the newest price. This guard is simple but important.

## 4. Trigger 2 — activate alerts after a price drop

**Trigger:** `trg_check_price_alerts` — `AFTER UPDATE ON store_listing`

- `OLD.current_price`: previous price.
- `NEW.current_price`: updated price.
- The `IF` checks whether the price **decreased**.
- The `UPDATE price_alert` marks only `ACTIVE` alerts for the same product with `target_price >= NEW.current_price` as `TRIGGERED`. It sets `triggered_date = CURDATE()`.

**Why AFTER?** A successful listing update triggers a change in **another table**. This resembles the tutorial's Q9/Q10 pattern, and OLD/NEW comparison resembles Q5/Q6.

### Example (illustrative)

Initial: listing 1 has price 130000; user has an active alert for the same product with target 125000.

1. Insert new `price_history` row at 119999 with a newer timestamp.
2. Trigger 1 updates listing 1 to 119999.
3. That UPDATE fires trigger 2.
4. Because 119999 < 130000 and 125000 >= 119999, the alert becomes TRIGGERED.

Actual results depend on the existing row and its timestamps.

## 5. Read-only inspection commands

```sql
USE price_comparison_db;

SHOW TABLES;
SHOW TRIGGERS;
SHOW CREATE TRIGGER trg_sync_listing_price;
SHOW CREATE TRIGGER trg_check_price_alerts;

SELECT listing_id, product_id, current_price, last_updated
FROM store_listing
WHERE listing_id = 1;

SELECT alert_id, user_id, product_id, target_price, alert_status
FROM price_alert
WHERE product_id = 1;
```

## 6. Safe trigger demonstration (run in MySQL Workbench or MySQL CLI)

The next test inserts into `price_history` and uses **`ROLLBACK`** so the demo does not permanently alter prices or alerts. Run each complete block in the **same database session**. Verify that the tables are InnoDB and that your selected timestamp is unused (composite PK).

```sql
USE price_comparison_db;
START TRANSACTION;

-- Choose an existing listing; sample below uses listing_id = 1.
SELECT listing_id, product_id, current_price, last_updated
FROM store_listing WHERE listing_id = 1;

-- Check its related alerts before testing.
SELECT alert_id, target_price, alert_status
FROM price_alert WHERE product_id = 1;

-- Insert a record newer than the listing's last_updated.
-- NOTE: adjust this example price to be BELOW its current price.
INSERT INTO price_history (listing_id, recorded_timestamp, price)
VALUES (1, '2030-01-01 12:00:00', 119999.00);

-- Observe the synchronization and any qualifying alert changes.
SELECT listing_id, current_price, last_updated
FROM store_listing WHERE listing_id = 1;
SELECT alert_id, target_price, alert_status, triggered_date
FROM price_alert WHERE product_id = 1;

ROLLBACK;

-- Confirm original database state is restored.
SELECT listing_id, current_price, last_updated
FROM store_listing WHERE listing_id = 1;
```

**Cautions:** If listing 1 currently has price 0, then the example 119999 is a price **increase** and alert trigger 2 will correctly *not* fire. Choose a valid listing with a higher starting price or make a temporary price setup inside the same transaction. Make sure a qualifying `ACTIVE` price alert exists before testing. Seed data includes zero-valued listings, so do not assume a seeded price is 130000. `price_history` has a `(listing_id, recorded_timestamp)` PK, so a repeated timestamp causes a duplicate-key error.

## 7. Full-stack evaluation risks found in the repository

These are observations from source inspection, not a completed running integration test:

1. **Frontend history response mismatch**: the backend returns a **list** of `{listing_id, store_name, history:[...]}` objects. `frontend/script.js` treats that list like a dictionary of arrays; its `Object.keys(hData)` logic does not match the API response and can lead to missing charts.
2. **Watchlist split**: `frontend/script.js` uses `localStorage`; backend CRUD routes work with `watches`. Demo the actual DB watchlist through `/docs`, not the browser heart alone.
3. **Auth/admin split**: backend includes JWT auth and `POST /api/simulate/price-update`, but the HTML frontend does not expose the auth/admin simulator workflow documented in the implementation README. Test it through Swagger.
4. **Zero prices in seed data**: `03_seed_data.sql` stores many `0.0` values in listings and price history. The schema allows `>= 0`, but this can distort best prices and deal metrics.
5. **History timestamps and demo date**: price observations are seeded around August–October 2026; date-window queries use `NOW()`. Check demo-date-dependent results.
6. **Committed environment file**: `backend/.env` is tracked. Treat DB passwords and JWT secrets as compromised if real; rotate them, remove tracked credentials, add a `.gitignore`, and provide `.env.example` instead.
7. **Permissive CORS**: `backend/main.py` allows all origins alongside credentials. Tighten before any real deployment.
8. **Database initializer is destructive**: `01_schema.sql` drops and recreates the database. Run only on a disposable, backed-up evaluation database.

## 8. Professor-viva questions to rehearse

1. What is an ECA trigger (Event, Condition, Action)? Give one example from PriceSense.
2. Why use `AFTER INSERT` for the first trigger and `AFTER UPDATE` for the second?
3. How do `OLD` and `NEW` differ? Why is `OLD` unavailable in INSERT?
4. Why does the first trigger update `store_listing`, not `price_history`?
5. What prevents older data from overwriting a newer listing price?
6. What happens if the new price is equal to or higher than the old price?
7. Can an alert trigger for another product? Explain the WHERE clause.
8. How do PK, FK, UNIQUE, CHECK, and ON DELETE CASCADE appear in this schema?
9. Why does `watches` need a composite PK? Explain the many-to-many relationship.
10. Which operations are implemented as stored procedures? Which are views? Which run automatically?
11. What is a transaction, and how does rollback help test two chained triggers?
12. Is the homepage guaranteed to show values from MySQL? How would you prove it?

**Honest limitation:** The GitHub inspection does not prove that the whole stack runs successfully on your local MySQL installation. Before the end-term evaluation, perform a live integration test. Do not claim real-time marketplace scraping or delivered notifications: the repository contains illustrative marketplace data, and the backend primarily simulates price changes.
