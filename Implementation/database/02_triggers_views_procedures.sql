USE price_comparison_db;

DELIMITER //

CREATE TRIGGER trg_sync_listing_price
AFTER INSERT ON price_history
FOR EACH ROW
BEGIN
    UPDATE store_listing
    SET current_price = NEW.price,
        last_updated = NEW.recorded_timestamp
    WHERE listing_id = NEW.listing_id
      AND last_updated <= NEW.recorded_timestamp;
END //

CREATE TRIGGER trg_check_price_alerts
AFTER UPDATE ON store_listing
FOR EACH ROW
BEGIN
    IF NEW.current_price < OLD.current_price THEN
        UPDATE price_alert
        SET alert_status = 'TRIGGERED',
            triggered_date = CURDATE()
        WHERE product_id = NEW.product_id
          AND alert_status = 'ACTIVE'
          AND target_price >= NEW.current_price;
    END IF;
END //

CREATE PROCEDURE sp_compare_prices(IN p_product_id INT)
BEGIN
    SELECT p.product_name, p.brand,
           s.store_name, s.website_url,
           sl.listing_id, sl.current_price, sl.delivery_charge,
           (sl.current_price + sl.delivery_charge) AS total_price,
           sl.availability, sl.seller_name,
           sl.avg_rating, sl.review_count,
           sl.product_url, sl.last_updated
    FROM product p
    JOIN store_listing sl ON p.product_id = sl.product_id
    JOIN store s ON sl.store_id = s.store_id
    WHERE p.product_id = p_product_id
    ORDER BY total_price ASC;
END //

CREATE PROCEDURE sp_deal_intelligence(IN p_product_id INT)
BEGIN
    SELECT p.product_name, p.brand,
           s.store_name,
           sl.listing_id,
           sl.current_price,
           sl.delivery_charge,
           (sl.current_price + sl.delivery_charge) AS net_price,
           pps.all_time_low,
           pps.all_time_high,
           pps.avg_30d,
           pps.avg_90d,
           CASE
               WHEN sl.current_price <= pps.all_time_low THEN 'ALL_TIME_LOW'
               WHEN pps.avg_30d IS NOT NULL AND sl.current_price < pps.avg_30d * 0.90 THEN 'GREAT_DEAL'
               WHEN pps.avg_30d IS NOT NULL AND sl.current_price < pps.avg_30d THEN 'GOOD_DEAL'
               WHEN pps.avg_30d IS NOT NULL AND sl.current_price <= pps.avg_30d * 1.05 THEN 'FAIR_PRICE'
               ELSE 'OVERPRICED'
           END AS deal_rating,
           CASE
               WHEN pps.avg_30d IS NOT NULL AND pps.avg_30d > 0
               THEN ROUND(((pps.avg_30d - sl.current_price) / pps.avg_30d) * 100, 1)
               ELSE NULL
           END AS savings_pct_vs_30d_avg
    FROM product p
    JOIN store_listing sl ON p.product_id = sl.product_id
    JOIN store s ON sl.store_id = s.store_id
    LEFT JOIN product_price_summary pps ON p.product_id = pps.product_id
    WHERE p.product_id = p_product_id
      AND sl.availability = 'IN_STOCK'
    ORDER BY net_price ASC;
END //

CREATE PROCEDURE sp_search_products(
    IN p_keyword VARCHAR(255),
    IN p_category_id INT,
    IN p_min_price DECIMAL(12,2),
    IN p_max_price DECIMAL(12,2),
    IN p_brand VARCHAR(100)
)
BEGIN
    SELECT p.product_id, p.product_name, p.brand, p.description,
           c.category_name,
           MIN(sl.current_price) AS min_price,
           MAX(sl.current_price) AS max_price,
           COUNT(DISTINCT sl.store_id) AS store_count
    FROM product p
    JOIN category c ON p.category_id = c.category_id
    LEFT JOIN store_listing sl ON p.product_id = sl.product_id AND sl.availability = 'IN_STOCK'
    WHERE (p_keyword IS NULL OR p.product_name LIKE CONCAT('%', p_keyword, '%')
           OR p.brand LIKE CONCAT('%', p_keyword, '%')
           OR p.description LIKE CONCAT('%', p_keyword, '%'))
      AND (p_category_id IS NULL OR p.category_id = p_category_id
           OR p.category_id IN (SELECT category_id FROM category WHERE parent_category_id = p_category_id))
      AND (p_min_price IS NULL OR sl.current_price >= p_min_price)
      AND (p_max_price IS NULL OR sl.current_price <= p_max_price)
      AND (p_brand IS NULL OR p.brand = p_brand)
    GROUP BY p.product_id, p.product_name, p.brand, p.description, c.category_name
    ORDER BY p.product_name;
END //

CREATE PROCEDURE sp_get_price_history(IN p_listing_id INT, IN p_days INT)
BEGIN
    IF p_days IS NULL THEN
        SELECT ph.recorded_timestamp, ph.price
        FROM price_history ph
        WHERE ph.listing_id = p_listing_id
        ORDER BY ph.recorded_timestamp ASC;
    ELSE
        SELECT ph.recorded_timestamp, ph.price
        FROM price_history ph
        WHERE ph.listing_id = p_listing_id
          AND ph.recorded_timestamp >= DATE_SUB(NOW(), INTERVAL p_days DAY)
        ORDER BY ph.recorded_timestamp ASC;
    END IF;
END //

CREATE PROCEDURE sp_add_to_watchlist(IN p_user_id INT, IN p_product_id INT)
BEGIN
    INSERT IGNORE INTO watches (user_id, product_id, added_date)
    VALUES (p_user_id, p_product_id, CURDATE());
END //

CREATE PROCEDURE sp_remove_from_watchlist(IN p_user_id INT, IN p_product_id INT)
BEGIN
    DELETE FROM watches WHERE user_id = p_user_id AND product_id = p_product_id;
END //

CREATE PROCEDURE sp_set_price_alert(
    IN p_user_id INT,
    IN p_product_id INT,
    IN p_target_price DECIMAL(12,2)
)
BEGIN
    INSERT INTO price_alert (user_id, product_id, target_price, alert_status, created_date)
    VALUES (p_user_id, p_product_id, p_target_price, 'ACTIVE', CURDATE());
END //

CREATE PROCEDURE sp_get_user_dashboard(IN p_user_id INT)
BEGIN
    SELECT 'WATCHLIST' AS section,
           p.product_id, p.product_name, p.brand,
           w.added_date,
           MIN(sl.current_price) AS best_price,
           NULL AS target_price, NULL AS alert_status, NULL AS triggered_date
    FROM watches w
    JOIN product p ON w.product_id = p.product_id
    LEFT JOIN store_listing sl ON p.product_id = sl.product_id AND sl.availability = 'IN_STOCK'
    WHERE w.user_id = p_user_id
    GROUP BY p.product_id, p.product_name, p.brand, w.added_date

    UNION ALL

    SELECT 'ALERT' AS section,
           p.product_id, p.product_name, p.brand,
           pa.created_date AS added_date,
           MIN(sl.current_price) AS best_price,
           pa.target_price, pa.alert_status, pa.triggered_date
    FROM price_alert pa
    JOIN product p ON pa.product_id = p.product_id
    LEFT JOIN store_listing sl ON p.product_id = sl.product_id AND sl.availability = 'IN_STOCK'
    WHERE pa.user_id = p_user_id
    GROUP BY p.product_id, p.product_name, p.brand, pa.created_date,
             pa.target_price, pa.alert_status, pa.triggered_date;
END //

CREATE PROCEDURE sp_top_deals(IN p_limit INT)
BEGIN
    SELECT p.product_id, p.product_name, p.brand,
           c.category_name,
           s.store_name,
           sl.listing_id, sl.current_price, sl.delivery_charge,
           (sl.current_price + sl.delivery_charge) AS net_price,
           sl.avg_rating, sl.review_count,
           sl.product_url,
           sub.avg_90d,
           CASE
               WHEN sub.avg_90d IS NOT NULL AND sub.avg_90d > 0
               THEN ROUND(((sub.avg_90d - sl.current_price) / sub.avg_90d) * 100, 1)
               ELSE 0
           END AS discount_pct
    FROM store_listing sl
    JOIN product p ON sl.product_id = p.product_id
    JOIN category c ON p.category_id = c.category_id
    JOIN store s ON sl.store_id = s.store_id
    LEFT JOIN (
        SELECT sl2.product_id,
               AVG(CASE WHEN ph.recorded_timestamp >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN ph.price END) AS avg_90d
        FROM store_listing sl2
        JOIN price_history ph ON ph.listing_id = sl2.listing_id
        GROUP BY sl2.product_id
    ) sub ON p.product_id = sub.product_id
    WHERE sl.availability = 'IN_STOCK'
    ORDER BY discount_pct DESC
    LIMIT p_limit;
END //

CREATE PROCEDURE sp_simulate_price_update(
    IN p_listing_id INT,
    IN p_new_price DECIMAL(12,2)
)
BEGIN
    INSERT INTO price_history (listing_id, recorded_timestamp, price)
    VALUES (p_listing_id, NOW(), p_new_price);
END //

DELIMITER ;

CREATE VIEW v_offer AS
SELECT o.offer_id, o.listing_id, o.offer_type, o.description,
       o.valid_from, o.valid_until,
       CASE WHEN CURDATE() BETWEEN o.valid_from AND o.valid_until
            THEN 'ACTIVE' ELSE 'EXPIRED' END AS offer_status
FROM offer o;

CREATE VIEW v_active_offers AS
SELECT o.offer_id, o.listing_id, o.offer_type, o.description,
       o.valid_from, o.valid_until,
       co.coupon_code, co.discount_value AS coupon_discount_value,
       do2.discount_percent,
       cao.cashback_amount, cao.max_cashback
FROM offer o
LEFT JOIN coupon_offer co ON o.offer_id = co.offer_id
LEFT JOIN discount_offer do2 ON o.offer_id = do2.offer_id
LEFT JOIN cashback_offer cao ON o.offer_id = cao.offer_id
WHERE CURDATE() BETWEEN o.valid_from AND o.valid_until;

CREATE VIEW current_best_prices AS
SELECT sl.product_id, sl.listing_id, sl.store_id, sl.current_price,
       sl.delivery_charge,
       (sl.current_price + sl.delivery_charge) AS total_price
FROM store_listing sl
INNER JOIN (
    SELECT product_id, MIN(current_price + delivery_charge) AS min_total
    FROM store_listing
    WHERE availability = 'IN_STOCK'
    GROUP BY product_id
) best ON sl.product_id = best.product_id
     AND (sl.current_price + sl.delivery_charge) = best.min_total
WHERE sl.availability = 'IN_STOCK';

CREATE VIEW product_price_summary AS
SELECT sl.product_id,
       MIN(ph.price) AS all_time_low,
       MAX(ph.price) AS all_time_high,
       AVG(ph.price) AS overall_avg,
       AVG(CASE WHEN ph.recorded_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN ph.price END) AS avg_30d,
       AVG(CASE WHEN ph.recorded_timestamp >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN ph.price END) AS avg_90d,
       MIN(CASE WHEN ph.recorded_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN ph.price END) AS min_30d,
       MIN(CASE WHEN ph.recorded_timestamp >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN ph.price END) AS min_90d
FROM store_listing sl
JOIN price_history ph ON ph.listing_id = sl.listing_id
GROUP BY sl.product_id;

CREATE VIEW v_store_comparison AS
SELECT p.product_id, p.product_name, p.brand,
       c.category_name,
       s.store_id, s.store_name,
       sl.listing_id, sl.current_price, sl.delivery_charge,
       (sl.current_price + sl.delivery_charge) AS total_price,
       sl.availability, sl.seller_name, sl.avg_rating, sl.review_count,
       sl.product_url, sl.last_updated
FROM product p
JOIN category c ON p.category_id = c.category_id
JOIN store_listing sl ON p.product_id = sl.product_id
JOIN store s ON sl.store_id = s.store_id;

CREATE VIEW v_deal_intelligence AS
SELECT p.product_id, p.product_name, p.brand,
       c.category_name,
       s.store_name,
       sl.listing_id, sl.current_price, sl.delivery_charge,
       (sl.current_price + sl.delivery_charge) AS net_price,
       pps.all_time_low, pps.all_time_high,
       pps.avg_30d, pps.avg_90d,
       CASE
           WHEN sl.current_price <= pps.all_time_low THEN 'ALL_TIME_LOW'
           WHEN pps.avg_30d IS NOT NULL AND sl.current_price < pps.avg_30d * 0.90 THEN 'GREAT_DEAL'
           WHEN pps.avg_30d IS NOT NULL AND sl.current_price < pps.avg_30d THEN 'GOOD_DEAL'
           WHEN pps.avg_30d IS NOT NULL AND sl.current_price <= pps.avg_30d * 1.05 THEN 'FAIR_PRICE'
           ELSE 'OVERPRICED'
       END AS deal_rating,
       CASE
           WHEN pps.avg_30d IS NOT NULL AND pps.avg_30d > 0
           THEN ROUND(((pps.avg_30d - sl.current_price) / pps.avg_30d) * 100, 1)
           ELSE NULL
       END AS savings_pct
FROM product p
JOIN category c ON p.category_id = c.category_id
JOIN store_listing sl ON p.product_id = sl.product_id
JOIN store s ON sl.store_id = s.store_id
LEFT JOIN product_price_summary pps ON p.product_id = pps.product_id
WHERE sl.availability = 'IN_STOCK';
