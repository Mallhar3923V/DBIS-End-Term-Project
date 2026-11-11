DROP DATABASE IF EXISTS price_comparison_db;
CREATE DATABASE price_comparison_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE price_comparison_db;

CREATE TABLE category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id INT,
    FOREIGN KEY (parent_category_id) REFERENCES category(category_id) ON DELETE SET NULL
);

CREATE TABLE product (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE RESTRICT
);

CREATE TABLE product_spec (
    product_id INT NOT NULL,
    spec_name VARCHAR(100) NOT NULL,
    spec_value VARCHAR(255) NOT NULL,
    PRIMARY KEY (product_id, spec_name),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

CREATE TABLE store (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL UNIQUE,
    website_url VARCHAR(255) NOT NULL UNIQUE,
    store_status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    CHECK (store_status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE store_listing (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    store_id INT NOT NULL,
    store_product_id VARCHAR(100) NOT NULL,
    current_price DECIMAL(12,2) NOT NULL,
    availability VARCHAR(15) NOT NULL DEFAULT 'IN_STOCK',
    seller_name VARCHAR(150),
    product_url VARCHAR(500) NOT NULL,
    delivery_charge DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    avg_rating DECIMAL(2,1),
    review_count INT NOT NULL DEFAULT 0,
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (current_price >= 0),
    CHECK (availability IN ('IN_STOCK', 'OUT_OF_STOCK')),
    CHECK (delivery_charge >= 0),
    CHECK (avg_rating >= 0 AND avg_rating <= 5),
    CHECK (review_count >= 0),
    UNIQUE (product_id, store_id),
    UNIQUE (store_id, store_product_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES store(store_id) ON DELETE CASCADE
);

CREATE TABLE price_history (
    listing_id INT NOT NULL,
    recorded_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (listing_id, recorded_timestamp),
    CHECK (price >= 0),
    FOREIGN KEY (listing_id) REFERENCES store_listing(listing_id) ON DELETE CASCADE
);

CREATE TABLE offer (
    offer_id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    offer_type VARCHAR(10) NOT NULL,
    description TEXT,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    CHECK (offer_type IN ('COUPON', 'DISCOUNT', 'CASHBACK')),
    CHECK (valid_until > valid_from),
    UNIQUE (offer_id, offer_type),
    FOREIGN KEY (listing_id) REFERENCES store_listing(listing_id) ON DELETE CASCADE
);

CREATE TABLE coupon_offer (
    offer_id INT PRIMARY KEY,
    offer_type VARCHAR(10) NOT NULL DEFAULT 'COUPON',
    coupon_code VARCHAR(50) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    CHECK (offer_type = 'COUPON'),
    CHECK (discount_value >= 0),
    FOREIGN KEY (offer_id, offer_type) REFERENCES offer(offer_id, offer_type) ON DELETE CASCADE
);

CREATE TABLE discount_offer (
    offer_id INT PRIMARY KEY,
    offer_type VARCHAR(10) NOT NULL DEFAULT 'DISCOUNT',
    discount_percent DECIMAL(5,2) NOT NULL,
    CHECK (offer_type = 'DISCOUNT'),
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
    FOREIGN KEY (offer_id, offer_type) REFERENCES offer(offer_id, offer_type) ON DELETE CASCADE
);

CREATE TABLE cashback_offer (
    offer_id INT PRIMARY KEY,
    offer_type VARCHAR(10) NOT NULL DEFAULT 'CASHBACK',
    cashback_amount DECIMAL(10,2) NOT NULL,
    max_cashback DECIMAL(10,2),
    CHECK (offer_type = 'CASHBACK'),
    CHECK (cashback_amount >= 0),
    CHECK (max_cashback IS NULL OR max_cashback >= 0),
    FOREIGN KEY (offer_id, offer_type) REFERENCES offer(offer_id, offer_type) ON DELETE CASCADE
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(5) NOT NULL DEFAULT 'USER',
    account_status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    registration_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    CHECK (role IN ('USER', 'ADMIN')),
    CHECK (account_status IN ('ACTIVE', 'BLOCKED'))
);

CREATE TABLE price_alert (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    target_price DECIMAL(12,2) NOT NULL,
    alert_status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    triggered_date DATE,
    CHECK (target_price > 0),
    CHECK (alert_status IN ('ACTIVE', 'TRIGGERED', 'DISABLED')),
    CHECK (triggered_date IS NULL OR triggered_date >= created_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

CREATE TABLE watches (
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    added_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

CREATE INDEX idx_product_name ON product(product_name);
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_product_brand ON product(brand);
CREATE INDEX idx_listing_product ON store_listing(product_id);
CREATE INDEX idx_listing_store ON store_listing(store_id);
CREATE INDEX idx_offer_listing ON offer(listing_id);
CREATE INDEX idx_offer_type ON offer(offer_type);
CREATE INDEX idx_alert_user ON price_alert(user_id);
CREATE INDEX idx_alert_product ON price_alert(product_id, alert_status);
CREATE INDEX idx_watches_product ON watches(product_id);
CREATE INDEX idx_price_history_listing ON price_history(listing_id);
CREATE INDEX idx_category_parent ON category(parent_category_id);
