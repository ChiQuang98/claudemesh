---
name: oltp-olap
description: OLTP vs OLAP database design patterns. Use when designing transactional or analytical databases, or planning data architecture.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# OLTP vs OLAP

## Overview
Understanding the difference between Online Transaction Processing (OLTP) and Online Analytical Processing (OLAP) systems.

## OLTP (Online Transaction Processing)

### Characteristics
- **Purpose**: Transaction processing, day-to-day operations
- **Data**: Current, detailed, operational
- **Queries**: Simple, fast, predictable
- **Users**: Front-line employees, customers
- **Updates**: Frequent (INSERT, UPDATE, DELETE)
- **Normalization**: Highly normalized (3NF+)
- **Indexing**: Primary keys, foreign keys
- **Examples**: E-commerce, banking, CRM

### OLTP Schema Design
```sql
-- Users table (normalized)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2),
    shipping_address JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_orders (user_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status (status)
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    INDEX idx_order_items (order_id),
    INDEX idx_product_items (product_id)
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT REFERENCES categories(id),
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_price (price)
);
```

### OLTP Best Practices
```sql
-- Use transactions for data consistency
BEGIN;
    INSERT INTO orders (user_id, total_amount, status)
    VALUES (123, 100.00, 'pending');

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES
        (currval('orders_id_seq'), 1, 2, 25.00),
        (currval('orders_id_seq'), 2, 1, 50.00);

    UPDATE products
    SET stock_quantity = stock_quantity - 2
    WHERE id = 1;

    UPDATE products
    SET stock_quantity = stock_quantity - 1
    WHERE id = 2;
COMMIT;

-- Use constraints for data integrity
ALTER TABLE orders
ADD CONSTRAINT chk_total_amount_positive CHECK (total_amount >= 0),
ADD CONSTRAINT chk_valid_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Use indexes for performance
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);
CREATE INDEX idx_orders_status_date ON orders(status, order_date);
```

## OLAP (Online Analytical Processing)

### Characteristics
- **Purpose**: Analytics, reporting, decision-making
- **Data**: Historical, aggregated, summarized
- **Queries**: Complex, ad-hoc, analytical
- **Users**: Analysts, executives, data scientists
- **Updates**: Batch loads, minimal modifications
- **Denormalization**: Star schema, snowflake schema
- **Indexing**: Bitmap indexes, materialized views
- **Examples**: Data warehouse, business intelligence

### Star Schema Design
```sql
-- Fact table (central transaction table)
CREATE TABLE fact_sales (
    sales_id BIGINT,
    date_key INT REFERENCES dim_date(date_key),
    product_key INT REFERENCES dim_product(product_key),
    customer_key INT REFERENCES dim_customer(customer_key),
    store_key INT REFERENCES dim_store(store_key),
    promotion_key INT REFERENCES dim_promotion(promotion_key),
    quantity_sold INT,
    sales_amount DECIMAL(10, 2),
    cost_amount DECIMAL(10, 2),
    profit_amount DECIMAL(10, 2) GENERATED ALWAYS AS (sales_amount - cost_amount) STORED,
    PRIMARY KEY (sales_id)
)
PARTITION BY RANGE (date_key);

-- Date dimension
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,
    date_value DATE NOT NULL,
    year INT,
    quarter INT,
    month INT,
    month_name VARCHAR(20),
    week INT,
    day INT,
    day_of_week INT,
    day_name VARCHAR(20),
    is_holiday BOOLEAN DEFAULT FALSE,
    is_weekend BOOLEAN DEFAULT FALSE
);

-- Product dimension
CREATE TABLE dim_product (
    product_key INT PRIMARY KEY,
    product_id INT,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    unit_price DECIMAL(10, 2),
    weight DECIMAL(10, 2),
    introduction_date DATE,
    discontinuation_date DATE
);

-- Customer dimension
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(255),
    email VARCHAR(255),
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    segment VARCHAR(50),  -- consumer, corporate, etc.
    tier VARCHAR(20),  -- gold, silver, bronze
    first_purchase_date DATE,
    birth_date DATE,
    gender CHAR(1),
    marital_status VARCHAR(20),
    education VARCHAR(50),
    occupation VARCHAR(100)
);

-- Store dimension
CREATE TABLE dim_store (
    store_key INT PRIMARY KEY,
    store_id INT,
    store_name VARCHAR(255),
    store_type VARCHAR(50),  -- online, physical, franchise
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    address VARCHAR(500),
    square_footage INT,
    opening_date DATE
);

-- Promotion dimension
CREATE TABLE dim_promotion (
    promotion_key INT PRIMARY KEY,
    promotion_id INT,
    promotion_name VARCHAR(255),
    promotion_type VARCHAR(50),  -- discount, bundle, seasonal
    discount_percentage DECIMAL(5, 2),
    start_date DATE,
    end_date DATE
);
```

### Snowflake Schema Design
```sql
-- Fact table
CREATE TABLE fact_sales (
    sales_id BIGINT,
    date_key INT REFERENCES dim_date(date_key),
    product_key INT REFERENCES dim_product(product_key),
    customer_key INT REFERENCES dim_customer(customer_key),
    store_key INT REFERENCES dim_store(store_key),
    quantity_sold INT,
    sales_amount DECIMAL(10, 2),
    PRIMARY KEY (sales_id)
);

-- Product dimension (normalized)
CREATE TABLE dim_product (
    product_key INT PRIMARY KEY,
    product_name VARCHAR(255),
    category_key INT REFERENCES dim_category(category_key),
    brand_key INT REFERENCES dim_brand(brand_key)
);

CREATE TABLE dim_category (
    category_key INT PRIMARY KEY,
    category_name VARCHAR(100),
    department VARCHAR(100)
);

CREATE TABLE dim_brand (
    brand_key INT PRIMARY KEY,
    brand_name VARCHAR(100)
);
```

## ETL Process (OLTP to OLAP)

### Extract
```sql
-- Extract changed data from OLTP
CREATE TABLE etl_sales (
    etl_id SERIAL PRIMARY KEY,
    sales_id INT,
    extraction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    UNIQUE (sales_id)
);

-- Capture changes (CDC approach)
INSERT INTO etl_sales (sales_id)
SELECT o.id
FROM orders o
LEFT JOIN etl_sales e ON o.id = e.sales_id
WHERE o.updated_at > COALESCE(
    (SELECT MAX(extraction_time) FROM etl_sales),
    '1970-01-01'::timestamp
);
```

### Transform
```sql
-- Transform and load into star schema
INSERT INTO fact_sales (
    sales_id,
    date_key,
    product_key,
    customer_key,
    store_key,
    quantity_sold,
    sales_amount,
    cost_amount
)
SELECT
    o.id AS sales_id,
    d.date_key,
    p.product_key,
    c.customer_key,
    s.store_key,
    SUM(oi.quantity) AS quantity_sold,
    SUM(oi.quantity * oi.unit_price) AS sales_amount,
    SUM(oi.quantity * pr.cost) AS cost_amount
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN etl_sales e ON o.id = e.sales_id
JOIN dim_date d ON DATE(o.order_date) = d.date_value
JOIN dim_product p ON oi.product_id = p.product_id
JOIN dim_customer c ON o.user_id = c.customer_id
JOIN dim_store s ON 1 = 1  -- Assume single store
JOIN products pr ON oi.product_id = pr.id
WHERE e.processed = FALSE
GROUP BY o.id, d.date_key, p.product_key, c.customer_key, s.store_key;

-- Mark as processed
UPDATE etl_sales
SET processed = TRUE
WHERE processed = FALSE;
```

### Slowly Changing Dimensions (SCD)

#### Type 1: Overwrite
```sql
-- Update dimension record (lose history)
UPDATE dim_customer
SET email = 'newemail@example.com',
    city = 'New York'
WHERE customer_id = 123;
```

#### Type 2: Add New Row
```sql
-- Add new version (preserve history)
INSERT INTO dim_customer (
    customer_key,
    customer_id,
    customer_name,
    email,
    city,
    valid_from,
    valid_to,
    is_current
)
SELECT
    (SELECT MAX(customer_key) FROM dim_customer) + 1,
    customer_id,
    customer_name,
    'newemail@example.com',
    'New York',
    CURRENT_DATE,
    '9999-12-31',
    TRUE
FROM dim_customer
WHERE customer_id = 123 AND is_current = TRUE;

-- Invalidate old record
UPDATE dim_customer
SET valid_to = CURRENT_DATE - 1,
    is_current = FALSE
WHERE customer_id = 123 AND is_current = TRUE;
```

#### Type 3: Add New Column
```sql
-- Track history with new columns
ALTER TABLE dim_customer
ADD COLUMN previous_city VARCHAR(100),
ADD COLUMN city_changed_date DATE;

UPDATE dim_customer
SET previous_city = city,
    city = 'New York',
    city_changed_date = CURRENT_DATE
WHERE customer_id = 123;
```

## OLAP Query Patterns

### Aggregation Queries
```sql
-- Total sales by date
SELECT
    d.date_value,
    SUM(f.sales_amount) AS total_sales,
    SUM(f.profit_amount) AS total_profit
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
WHERE d.year = 2024
GROUP BY d.date_value
ORDER BY d.date_value;

-- Sales by category and month
SELECT
    d.year,
    d.month,
    p.category,
    SUM(f.sales_amount) AS total_sales,
    SUM(f.quantity_sold) AS total_quantity
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_key = p.product_key
WHERE d.year = 2024
GROUP BY d.year, d.month, p.category
ORDER BY d.month, p.category;

-- Top customers by revenue
SELECT
    c.customer_name,
    c.city,
    SUM(f.sales_amount) AS total_revenue,
    COUNT(DISTINCT f.sales_id) AS order_count
FROM fact_sales f
JOIN dim_customer c ON f.customer_key = c.customer_key
WHERE f.date_key BETWEEN 20240101 AND 20241231
GROUP BY c.customer_key, c.customer_name, c.city
ORDER BY total_revenue DESC
LIMIT 10;
```

### Roll-up and Drill-down
```sql
-- Roll-up: Aggregate to higher level
-- Month level
SELECT
    d.year,
    d.month,
    SUM(f.sales_amount) AS monthly_sales
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY d.year, d.month;

-- Quarter level
SELECT
    d.year,
    d.quarter,
    SUM(f.sales_amount) AS quarterly_sales
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY d.year, d.quarter;

-- Drill-down: More detailed data
-- Daily sales
SELECT
    d.date_value,
    p.category,
    SUM(f.sales_amount) AS daily_sales
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_key = p.product_key
WHERE d.date_value = '2024-01-15'
GROUP BY d.date_value, p.category;
```

### Slice and Dice
```sql
-- Slice: Single dimension filter
SELECT
    c.segment,
    SUM(f.sales_amount) AS segment_sales
FROM fact_sales f
JOIN dim_customer c ON f.customer_key = c.customer_key
WHERE c.segment = 'corporate'
GROUP BY c.segment;

-- Dice: Multiple dimension filters
SELECT
    c.segment,
    p.category,
    SUM(f.sales_amount) AS sales
FROM fact_sales f
JOIN dim_customer c ON f.customer_key = c.customer_key
JOIN dim_product p ON f.product_key = p.product_key
WHERE c.segment IN ('corporate', 'government')
  AND p.category IN ('electronics', 'furniture')
  AND d.year = 2024
GROUP BY c.segment, p.category;
```

## Performance Optimization

### Partitioning (OLAP)
```sql
-- Partition fact table by date range
CREATE TABLE fact_sales (
    sales_id BIGINT,
    date_key INT,
    product_key INT,
    customer_key INT,
    store_key INT,
    quantity_sold INT,
    sales_amount DECIMAL(10, 2),
    PRIMARY KEY (sales_id, date_key)
)
PARTITION BY RANGE (date_key);

-- Create partitions
CREATE TABLE fact_sales_2023_q1 PARTITION OF fact_sales
FOR VALUES FROM (20230101) TO (20230401);

CREATE TABLE fact_sales_2023_q2 PARTITION OF fact_sales
FOR VALUES FROM (20230401) TO (20230701);

-- Query uses partition pruning
SELECT * FROM fact_sales
WHERE date_key = 20230115;  -- Only scans fact_sales_2023_q1
```

### Materialized Views (OLAP)
```sql
-- Aggregate for common queries
CREATE MATERIALIZED VIEW mv_monthly_sales AS
SELECT
    d.year,
    d.month,
    p.category,
    SUM(f.sales_amount) AS total_sales,
    SUM(f.quantity_sold) AS total_quantity,
    COUNT(DISTINCT f.sales_id) AS order_count
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_key = p.product_key
GROUP BY d.year, d.month, p.category;

CREATE INDEX idx_monthly_sales_date ON mv_monthly_sales(year, month);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_monthly_sales;
```

## Comparison Matrix

| Aspect | OLTP | OLAP |
|--------|------|------|
| **Purpose** | Transaction processing | Analytics and reporting |
| **Data** | Current, detailed | Historical, aggregated |
| **Users** | Frontline staff, customers | Analysts, executives |
| **Queries** | Simple, fast | Complex, ad-hoc |
| **Updates** | Frequent | Batch, minimal |
| **Normalization** | Highly normalized | Denormalized |
| **Schema** | ER model | Star/snowflake |
| **Indexing** | B-tree, FK indexes | Bitmap, materialized views |
| **Performance** | Sub-second | Seconds to minutes |
| **Size** | GB to TB | TB to PB |
| **Examples** | E-commerce, banking | Data warehouse, BI |

## Best Practices

### OLTP:
- [ ] Normalize to 3NF+
- [ ] Use foreign keys for referential integrity
- [ ] Implement proper constraints
- [ ] Use transactions for consistency
- [ ] Index frequently queried columns
- [ ] Keep rows narrow (many columns → split tables)
- [ ] Optimize for INSERT/UPDATE/DELETE
- [ ] Use connection pooling
- [ ] Implement caching for reads
- [ ] Monitor transaction throughput

### OLAP:
- [ ] Use star schema for simplicity
- [ ] Use snowflake for complex dimensions
- [ ] Implement SCD for history tracking
- [ ] Partition large fact tables
- [ ] Create materialized views
- [ ] Use bitmap indexes
- [ ] Denormalize for read performance
- [ ] Aggregate for common queries
- [ ] Use ETL/ELT for data loading
- [ ] Schedule regular data refreshes

### ETL Process:
- [ ] Extract incrementally when possible
- [ ] Transform in staging area
- [ ] Validate data before loading
- [ ] Handle errors gracefully
- [ ] Monitor ETL performance
- [ ] Implement retry logic
- [ ] Log all transformations
- [ ] Test with production-like data
- [ ] Schedule during low-usage periods
- [ ] Document data lineage
