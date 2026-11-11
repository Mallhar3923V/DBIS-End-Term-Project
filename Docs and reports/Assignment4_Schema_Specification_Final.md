# Relational Schema Specification & ER Mapping
## Online Shopping Comparison & Deal Intelligence DBMS

> **Course**: CS 257 Database and Information Systems Lab  
> **Team Members**:
> - Mallhar Arvind Totey (250041026)
> - Aditya Barman (250001005)
> - Aryan Gothwal (250001010)

This document formalizes the mapping from the **Chen ER Diagram (`Untitled.png`)** and the ground truth problem statement (`DBIS Project.pdf`) into the production **MySQL 8.0 Relational Database Schema**.

---

## 1. Relational Table Definitions

### 1. CATEGORY
*Represents hierarchical product taxonomy with recursive self-referential foreign key.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `category_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique category identifier |
| `category_name` | `VARCHAR(100)` | **UK** | `NOT NULL, UNIQUE` | Unique category name |
| `description` | `TEXT` | — | `NULL allowed` | Category description |
| `parent_category_id`| `INT` | **FK** | `REFERENCES category(category_id) ON DELETE SET NULL` | Parent category for hierarchy |

---

### 2. PRODUCT
*Core catalog item classified under a category.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `product_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique product identifier |
| `product_name` | `VARCHAR(255)` | — | `NOT NULL` | Standardized product title |
| `brand` | `VARCHAR(100)` | — | `NOT NULL` | Manufacturer or brand |
| `description` | `TEXT` | — | `NULL allowed` | Product description |
| `category_id` | `INT` | **FK** | `NOT NULL, REFERENCES category(category_id) ON DELETE RESTRICT` | Classification reference |

---

### 3. PRODUCT_SPEC
*Weak entity representing normalized multi-valued technical specifications.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `product_id` | `INT` | **PK, FK** | `NOT NULL, REFERENCES product(product_id) ON DELETE CASCADE` | Product reference |
| `spec_name` | `VARCHAR(100)` | **PK** | `NOT NULL` | Specification key (e.g. "RAM", "Processor") |
| `spec_value` | `VARCHAR(255)` | — | `NOT NULL` | Specification value (e.g. "16GB", "M3") |

---

### 4. STORE
*E-commerce platforms that list products.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `store_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique store identifier |
| `store_name` | `VARCHAR(100)` | **UK** | `NOT NULL, UNIQUE` | Store brand name |
| `website_url` | `VARCHAR(255)` | **UK** | `NOT NULL, UNIQUE` | Store root URL |
| `store_status` | `VARCHAR(10)` | — | `CHECK (store_status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE'` | Operational status |

---

### 5. STORE_LISTING
*Association between a product and a store platform.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `listing_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique listing identifier |
| `product_id` | `INT` | **FK** | `NOT NULL, REFERENCES product(product_id) ON DELETE CASCADE` | Product reference |
| `store_id` | `INT` | **FK** | `NOT NULL, REFERENCES store(store_id) ON DELETE CASCADE` | Store reference |
| `store_product_id`| `VARCHAR(100)` | **UK** | `NOT NULL, UNIQUE(store_id, store_product_id)` | SKU / ASIN on merchant site |
| `current_price` | `DECIMAL(12,2)`| — | `NOT NULL, CHECK (current_price >= 0)` | Live price (synced via trigger) |
| `availability` | `VARCHAR(15)` | — | `CHECK (availability IN ('IN_STOCK', 'OUT_OF_STOCK')) DEFAULT 'IN_STOCK'` | Stock availability |
| `seller_name` | `VARCHAR(150)` | — | `NULL allowed` | Third-party seller merchant |
| `product_url` | `VARCHAR(500)` | — | `NOT NULL` | Direct deep link to buy on store |
| `delivery_charge`| `DECIMAL(8,2)` | — | `NOT NULL, DEFAULT 0.00, CHECK (delivery_charge >= 0)` | Standard shipping fee |
| `avg_rating` | `DECIMAL(2,1)` | — | `CHECK (avg_rating BETWEEN 0 AND 5)` | Customer review score |
| `review_count` | `INT` | — | `NOT NULL, DEFAULT 0, CHECK (review_count >= 0)` | Total number of reviews |
| `last_updated` | `DATETIME` | — | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Last price scrape timestamp |

---

### 6. PRICE_HISTORY
*Weak entity capturing temporal price fluctuations per store listing.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `listing_id` | `INT` | **PK, FK** | `NOT NULL, REFERENCES store_listing(listing_id) ON DELETE CASCADE` | Listing reference |
| `recorded_timestamp`| `DATETIME` | **PK** | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Snapshot timestamp |
| `price` | `DECIMAL(12,2)`| — | `NOT NULL, CHECK (price >= 0)` | Historical price at timestamp |

---

### 7. OFFER (Supertype)
*Promotional campaigns, discounts, and coupons associated with a store listing.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `offer_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique offer identifier |
| `listing_id` | `INT` | **FK** | `NOT NULL, REFERENCES store_listing(listing_id) ON DELETE CASCADE` | Listing reference |
| `offer_type` | `VARCHAR(10)` | — | `NOT NULL, CHECK (offer_type IN ('COUPON', 'DISCOUNT', 'CASHBACK'))` | Specialization discriminator |
| `description` | `TEXT` | — | `NULL allowed` | Terms and offer details |
| `valid_from` | `DATE` | — | `NOT NULL` | Offer start date |
| `valid_until` | `DATE` | — | `NOT NULL, CHECK (valid_until > valid_from)` | Offer expiration date |

#### 7a. COUPON_OFFER (Subtype)
| Column | Data Type | Key | Constraints |
| :--- | :--- | :--- | :--- |
| `offer_id` | `INT` | **PK, FK** | `REFERENCES offer(offer_id, offer_type) ON DELETE CASCADE` |
| `offer_type` | `VARCHAR(10)` | — | `CHECK (offer_type = 'COUPON') DEFAULT 'COUPON'` |
| `coupon_code`| `VARCHAR(50)` | — | `NOT NULL` (e.g. `ICICI3000`) |
| `discount_value`| `DECIMAL(10,2)`| — | `NOT NULL, CHECK (discount_value >= 0)` |

#### 7b. DISCOUNT_OFFER (Subtype)
| Column | Data Type | Key | Constraints |
| :--- | :--- | :--- | :--- |
| `offer_id` | `INT` | **PK, FK** | `REFERENCES offer(offer_id, offer_type) ON DELETE CASCADE` |
| `offer_type` | `VARCHAR(10)` | — | `CHECK (offer_type = 'DISCOUNT') DEFAULT 'DISCOUNT'` |
| `discount_percent`| `DECIMAL(5,2)`| — | `NOT NULL, CHECK (discount_percent BETWEEN 0 AND 100)` |

#### 7c. CASHBACK_OFFER (Subtype)
| Column | Data Type | Key | Constraints |
| :--- | :--- | :--- | :--- |
| `offer_id` | `INT` | **PK, FK** | `REFERENCES offer(offer_id, offer_type) ON DELETE CASCADE` |
| `offer_type` | `VARCHAR(10)` | — | `CHECK (offer_type = 'CASHBACK') DEFAULT 'CASHBACK'` |
| `cashback_amount`| `DECIMAL(10,2)`| — | `NOT NULL, CHECK (cashback_amount >= 0)` |
| `max_cashback`| `DECIMAL(10,2)`| — | `CHECK (max_cashback IS NULL OR max_cashback >= 0)` |

---

### 8. USERS
*Registered customers and platform administrators.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique user identifier |
| `name` | `VARCHAR(150)` | — | `NOT NULL` | Full name |
| `email` | `VARCHAR(150)` | **UK** | `NOT NULL, UNIQUE` | Login email address |
| `password_hash`| `VARCHAR(255)` | — | `NOT NULL` | Bcrypt password hash |
| `role` | `VARCHAR(5)` | — | `NOT NULL, DEFAULT 'USER', CHECK (role IN ('USER', 'ADMIN'))` | Access control role |
| `account_status`| `VARCHAR(10)`| — | `NOT NULL, DEFAULT 'ACTIVE', CHECK (account_status IN ('ACTIVE', 'BLOCKED'))` | Account state |
| `registration_date`| `DATE` | — | `NOT NULL, DEFAULT (CURRENT_DATE)` | Sign-up date |

---

### 9. PRICE_ALERT
*User-configured threshold for price drop notifications.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `alert_id` | `INT` | **PK** | `NOT NULL, AUTO_INCREMENT` | Unique alert identifier |
| `user_id` | `INT` | **FK** | `NOT NULL, REFERENCES users(user_id) ON DELETE CASCADE` | User reference |
| `product_id` | `INT` | **FK** | `NOT NULL, REFERENCES product(product_id) ON DELETE CASCADE` | Target product reference |
| `target_price` | `DECIMAL(12,2)`| — | `NOT NULL, CHECK (target_price > 0)` | Notification threshold |
| `alert_status` | `VARCHAR(10)` | — | `CHECK (alert_status IN ('ACTIVE', 'TRIGGERED', 'DISABLED')) DEFAULT 'ACTIVE'` | Alert state |
| `created_date` | `DATE` | — | `NOT NULL, DEFAULT (CURRENT_DATE)` | Alert creation date |
| `triggered_date`| `DATE` | — | `CHECK (triggered_date IS NULL OR triggered_date >= created_date)` | Date price dropped &le; target |

---

### 10. WATCHES (Associative Entity)
*Resolves the M:N relationship between USERS and PRODUCT.*

| Column | Data Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `INT` | **PK, FK** | `NOT NULL, REFERENCES users(user_id) ON DELETE CASCADE` | User reference |
| `product_id` | `INT` | **PK, FK** | `NOT NULL, REFERENCES product(product_id) ON DELETE CASCADE` | Product reference |
| `added_date` | `DATE` | — | `NOT NULL, DEFAULT (CURRENT_DATE)` | Date added to watchlist |

---

## 2. Normalization Verification
- **1NF**: All table columns are atomic; multi-valued product specifications are normalized into `product_spec`.
- **2NF**: No partial dependency exists; in all composite keys (`product_spec`, `price_history`, `watches`), non-key attributes depend on the complete primary key.
- **3NF & BCNF**: Every determinant is a candidate key. Derived attributes (`current_price`, `last_updated`, `offer_status`) are dynamically synchronized via automated database triggers or computed on-the-fly in views to prevent update anomalies.
