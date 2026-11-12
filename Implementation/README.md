# PriceSense — Online Shopping Price Comparison & Deal Intelligence DBMS

> **CS 257 Database and Information Systems Lab Project**  
> **Team Members**:
> - Mallhar Arvind Totey (250041026)
> - Aditya Barman (250001005)
> - Aryan Gothwal (250001010)

---

## 1. Project Overview & Problem Statement

Modern e-commerce platforms (Amazon, Flipkart, Croma, Reliance Digital) sell identical products at wildly varying prices with different delivery fees, cashback deals, and promotional coupons. Online shoppers struggle to:
1. Track product prices across multiple platforms simultaneously.
2. Determine whether a listed "discount" is genuinely a good deal or simply artificial markup.
3. Automatically monitor price fluctuations and receive notifications when a target threshold is hit.

### The Solution
**PriceSense** is a full-stack, database-driven web application featuring:
- **Centralized Relational Database Layer (MySQL 8.0)** maintaining products, hierarchical categories, store listings, 90-day price histories, promotional offers, user watchlists, and price alerts.
- **Deal Intelligence Engine** evaluating net effective prices against 30-day/90-day moving averages and all-time lows.
- **Automated Database Triggers** that synchronize current listing prices upon new history entries and instantly transition price alerts to `TRIGGERED` when prices fall below user target thresholds.
- **Modern Web Interface (PriceSense — Smooth Motion Edition)**: A responsive HTML5, CSS3, and JavaScript frontend with interactive 3D rotation, dynamic multi-store price comparisons, live search and category filtering, responsive watchlist drawer, and interactive 30d/90d/365d SVG price-trend charts.
- **RESTful API Backend (Python FastAPI)** utilizing raw SQL queries and stored procedures to demonstrate relational database engineering principles.

---

## 2. Architecture & File Structure

```
Implementation/
├── database/
│   ├── 01_schema.sql                  # 13 relational tables, constraints, indexes (MySQL 8.0, NO comments)
│   ├── 02_triggers_views_procedures.sql # 2 triggers, 6 views, 9 stored procedures (MySQL 8.0, NO comments)
│   ├── 03_seed_data.sql               # 25 products, 4 stores, 75 listings, ~770 price records, offers, users
│   └── init_db.py                     # Turnkey automated database creation & verification script
├── backend/
│   ├── .env                           # Database connection & JWT credentials
│   ├── requirements.txt               # Backend Python dependencies
│   ├── config.py                      # Application settings & environment loader
│   ├── database.py                    # MySQL connection pooling & cursor dependency
│   ├── auth.py                        # JWT authentication & bcrypt hashing
│   ├── main.py                        # FastAPI application entry point & CORS configuration
│   └── routers/
│       ├── auth_router.py             # User registration, login, and profile endpoints
│       ├── products_router.py         # Product search, category trees, specs, and price history
│       ├── deals_router.py            # Top deals and deal intelligence calculations
│       ├── watchlist_router.py        # User watchlist management
│       ├── alerts_router.py           # Price alert creation, listing, and simulator
│       └── dashboard_router.py        # Consolidated user dashboard
├── frontend/
│   ├── index.html                     # PriceSense main application page
│   ├── styles.css                     # Layout, responsive rules & smooth motion animations
│   ├── colour.css                     # Palette design system (violet, cyan, coral, lime)
│   ├── motion.js                      # 3D interactive cube controls & visibility observer
│   ├── script.js                      # Search, filters, watchlist drawer, compare modal, SVG charts
│   ├── data.js                        # Product catalog & price observations
│   ├── assets/                        # Inlined SVG product artwork
│   ├── build_demo.py                  # Standalone bundler script
│   └── PriceSense_Interactive_Demo.html # Standalone all-in-one demo (works offline)
├── PriceSense_Interactive_Demo.html   # Standalone demo in root of Implementation
└── price_comparison_schema (1).sql    # Consolidated master SQL file (clean MySQL 8.0, NO comments)
```

---

## 3. Database Design & Features (MySQL 8.0)

### 3.1 Tables
1. `category` — Hierarchical category tree via recursive foreign key `parent_category_id`.
2. `product` — Core product entities with name, brand, description, and category.
3. `product_spec` — Weak entity capturing technical specifications (`spec_name`, `spec_value`).
4. `store` — E-commerce platforms (Amazon India, Flipkart, Croma, Reliance Digital).
5. `store_listing` — Product listings per store with `current_price`, `delivery_charge`, `avg_rating`, `review_count`, and `availability`.
6. `price_history` — Weak entity tracking historical prices and timestamps.
7. `offer` — Supertype table for promotional campaigns.
8. `coupon_offer` — Subtype table for coupons with discount value.
9. `discount_offer` — Subtype table for percentage discounts.
10. `cashback_offer` — Subtype table for cashback incentives.
11. `users` — User credentials, bcrypt hash, role (`USER`, `ADMIN`), and registration date.
12. `price_alert` — User price alert criteria with `target_price`, `alert_status`, and `triggered_date`.
13. `watches` — Associative entity representing user watchlists.

### 3.2 Automated Triggers
- **`trg_sync_listing_price`**: Executed after an insert on `price_history`. Automatically synchronizes `current_price` and `last_updated` on `store_listing`.
- **`trg_check_price_alerts`**: Executed after an update on `store_listing`. If a price drop is detected, any matching active alerts with `target_price >= NEW.current_price` are instantly transitioned to `TRIGGERED` status with `triggered_date = CURDATE()`.

### 3.3 Stored Procedures
- `sp_search_products(keyword, category_id, min_price, max_price, brand)`
- `sp_compare_prices(product_id)`
- `sp_deal_intelligence(product_id)`
- `sp_get_price_history(listing_id, days)`
- `sp_top_deals(limit)`
- `sp_add_to_watchlist(user_id, product_id)`
- `sp_remove_from_watchlist(user_id, product_id)`
- `sp_set_price_alert(user_id, product_id, target_price)`
- `sp_get_user_dashboard(user_id)`
- `sp_simulate_price_update(listing_id, new_price)`

---

## 4. Setup & Running Instructions

### Step 1: Database Setup
Make sure MySQL 8.0 Server is running on your machine.
Update credentials in `Implementation/backend/.env` if necessary:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=price_comparison_db
```

Run the automated Python database initializer:
```bash
cd "D:\END TERM PROJECT\Implementation\database"
python init_db.py
```
*(Alternatively, execute `01_schema.sql`, `02_triggers_views_procedures.sql`, and `03_seed_data.sql` sequentially in MySQL Workbench or via MySQL Command Line Client).*

### Step 2: Backend Setup & Launch
```bash
cd "D:\END TERM PROJECT\Implementation\backend"
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`

### Step 3: Frontend Launch Options

**Option A (Instant / Zero Dependencies)**:
Simply double-click:
```
D:\END TERM PROJECT\Implementation\PriceSense_Interactive_Demo.html
```
in File Explorer to open the application in Chrome, Edge, or Firefox. It runs self-contained and works completely offline!

**Option B (Local Development Server)**:
```bash
cd "D:\END TERM PROJECT\Implementation\frontend"
python -m http.server 5173
```
- Open browser at `http://localhost:5173` (or run `npm run dev`)

---

## 5. Live Demonstration Guide for Evaluation

### Demo 1: Multi-Store Comparison & Net Cost Calculation
1. Open the homepage and search for `"iPhone 15 Pro Max"`.
2. View the comparison table showing Amazon, Flipkart, Croma, and Reliance Digital.
3. Observe how delivery fees and active coupons are aggregated to display the true net cost.

### Demo 2: Deal Intelligence Evaluation
1. Observe the Deal Intelligence card on the product page.
2. Note how the system calculates 30-day and 90-day moving averages and indicates whether the item is at an `ALL_TIME_LOW`, `GREAT_DEAL`, `FAIR_PRICE`, or `OVERPRICED`.

### Demo 3: Automated Price Drop Trigger Demonstration
1. Sign in as `rahul.sharma@gmail.com` (password: `password123`) or create a new user.
2. Navigate to iPhone 15 Pro Max and set a Price Alert for ₹125,000.
3. Sign in as admin (`admin@pricesense.com`, password: `password123`) and open the **Admin Trigger Simulator** in the Dashboard.
4. Update listing #1 price to ₹119,999.
5. Watch MySQL trigger `trg_check_price_alerts` immediately transition the alert from `ACTIVE` to `TRIGGERED`!
