---
name: bigquery-schema-design
description: Google BigQuery schema design patterns and best practices. Use when designing tables, choosing data types, or working with nested/repeated fields.
allowed-tools: Read, Bash
user-invocable: true
---

# BigQuery Schema Design

## Overview

BigQuery's columnar storage and distributed architecture require different schema design patterns than traditional RDBMS. This skill covers data types, nested structures, denormalization, and best practices.

## Data Types

### Numeric Types

```sql
-- Integer types
INT64         -- 8-byte signed integer (-9.2×10^18 to 9.2×10^18)
              -- Use for: IDs, counts, flags

-- Floating point
FLOAT64       -- 8-byte double precision
              -- Use for: Scientific data, approximations
              -- Warning: Precision loss for large numbers

-- Exact decimal
NUMERIC       -- 16-byte, 38 digits precision, 9 decimal places
              -- Use for: Financial data, currency
BIGNUMERIC    -- 32-byte, 76 digits precision, 38 decimal places
              -- Use for: Very large precise numbers

-- Examples
CREATE TABLE transactions (
  transaction_id INT64,           -- ID
  amount NUMERIC(10, 2),          -- Currency: 99999999.99
  exchange_rate FLOAT64,          -- Approximation OK
  precise_value BIGNUMERIC        -- When precision critical
);
```

### String Types

```sql
STRING        -- Variable length UTF-8, max 10 MB
              -- Use for: Text, JSON, encoded data

-- Examples
CREATE TABLE users (
  user_id INT64,
  username STRING,                -- Short text
  email STRING,                   -- Email addresses
  bio STRING,                     -- Longer text
  metadata STRING                 -- JSON as string
);
```

### Date/Time Types

```sql
DATE          -- YYYY-MM-DD (no time zone)
TIME          -- HH:MM:SS.SSSSSS (no date)
DATETIME      -- YYYY-MM-DD HH:MM:SS.SSSSSS (no time zone)
TIMESTAMP     -- Absolute point in time (UTC)

-- Examples
CREATE TABLE events (
  event_id INT64,
  event_date DATE,                -- Just the date
  event_time TIME,                -- Just the time
  event_datetime DATETIME,        -- Local date+time
  event_timestamp TIMESTAMP       -- UTC timestamp (recommended)
);

-- Best practice: Use TIMESTAMP for event times
-- DATETIME for user-local times (appointments, schedules)
```

### Boolean Type

```sql
BOOL          -- TRUE, FALSE, NULL

-- Example
CREATE TABLE users (
  user_id INT64,
  is_active BOOL,
  is_verified BOOL,
  has_subscription BOOL
);
```

### Bytes Type

```sql
BYTES         -- Variable length binary, max 10 MB
              -- Use for: Binary data, hashes, encoded content

-- Example
CREATE TABLE files (
  file_id INT64,
  content_hash BYTES,             -- SHA-256 hash
  thumbnail BYTES                 -- Small binary data
);
```

### Geography Type

```sql
GEOGRAPHY     -- Points, lines, polygons on Earth's surface

-- Example
CREATE TABLE locations (
  location_id INT64,
  name STRING,
  coordinates GEOGRAPHY           -- Point, polygon, etc.
);

-- Insert geography data
INSERT INTO locations VALUES
(1, 'New York', ST_GEOGPOINT(-74.006, 40.7128)),
(2, 'San Francisco', ST_GEOGPOINT(-122.4194, 37.7749));

-- Query within distance
SELECT name FROM locations
WHERE ST_DISTANCE(coordinates, ST_GEOGPOINT(-73.9857, 40.7484)) < 10000;
```

### JSON Type

```sql
JSON          -- Native JSON type (BigQuery 2023+)
              -- More efficient than STRING for JSON operations

-- Example
CREATE TABLE events (
  event_id INT64,
  event_data JSON
);

-- Query JSON fields
SELECT
  event_id,
  JSON_VALUE(event_data, '$.user.name') as user_name,
  JSON_VALUE(event_data, '$.action') as action
FROM events;
```

## Nested and Repeated Fields

### STRUCT (Nested Fields)

```sql
-- Define nested structure
CREATE TABLE orders (
  order_id INT64,
  customer STRUCT<
    id INT64,
    name STRING,
    email STRING
  >,
  shipping_address STRUCT<
    street STRING,
    city STRING,
    state STRING,
    zip STRING,
    country STRING
  >,
  created_at TIMESTAMP
);

-- Insert nested data
INSERT INTO orders VALUES (
  1001,
  STRUCT(123, 'John Doe', 'john@example.com'),
  STRUCT('123 Main St', 'New York', 'NY', '10001', 'USA'),
  CURRENT_TIMESTAMP()
);

-- Query nested fields
SELECT
  order_id,
  customer.name as customer_name,
  shipping_address.city as city
FROM orders;
```

### ARRAY (Repeated Fields)

```sql
-- Define array field
CREATE TABLE shopping_carts (
  cart_id INT64,
  user_id INT64,
  items ARRAY<STRING>,
  quantities ARRAY<INT64>,
  created_at TIMESTAMP
);

-- Insert array data
INSERT INTO shopping_carts VALUES (
  1,
  123,
  ['product_a', 'product_b', 'product_c'],
  [2, 1, 3],
  CURRENT_TIMESTAMP()
);

-- Query arrays
SELECT
  cart_id,
  ARRAY_LENGTH(items) as item_count,
  items[OFFSET(0)] as first_item
FROM shopping_carts;

-- Unnest arrays
SELECT
  cart_id,
  item
FROM shopping_carts,
UNNEST(items) as item;
```

### ARRAY of STRUCT (Best Pattern)

```sql
-- Combine for rich nested data
CREATE TABLE orders (
  order_id INT64,
  customer_id INT64,
  items ARRAY<STRUCT<
    product_id INT64,
    product_name STRING,
    quantity INT64,
    unit_price NUMERIC(10, 2),
    discount_percent FLOAT64
  >>,
  order_timestamp TIMESTAMP
);

-- Insert complex data
INSERT INTO orders VALUES (
  1001,
  123,
  [
    STRUCT(101, 'Widget A', 2, 19.99, 0.0),
    STRUCT(102, 'Widget B', 1, 29.99, 10.0),
    STRUCT(103, 'Widget C', 5, 9.99, 0.0)
  ],
  CURRENT_TIMESTAMP()
);

-- Query with UNNEST
SELECT
  order_id,
  item.product_name,
  item.quantity,
  item.unit_price * item.quantity * (1 - item.discount_percent/100) as line_total
FROM orders,
UNNEST(items) as item;

-- Aggregate across items
SELECT
  order_id,
  SUM(item.quantity) as total_items,
  SUM(item.unit_price * item.quantity) as subtotal
FROM orders,
UNNEST(items) as item
GROUP BY order_id;
```

## Denormalization Patterns

### Why Denormalize in BigQuery?

```
Traditional RDBMS: Normalize to reduce redundancy
BigQuery: Denormalize for performance

Benefits of denormalization:
- Fewer JOINs = less data shuffling
- Better compression (similar values together)
- Simpler queries
- Lower costs

Trade-offs:
- Data redundancy
- Update complexity
- Storage (but storage is cheap)
```

### Pattern 1: Embed Related Data

```sql
-- ❌ Normalized (requires JOIN)
CREATE TABLE orders (order_id INT64, customer_id INT64, amount NUMERIC);
CREATE TABLE customers (customer_id INT64, name STRING, email STRING);

SELECT o.*, c.name, c.email
FROM orders o JOIN customers c ON o.customer_id = c.customer_id;

-- ✅ Denormalized (no JOIN needed)
CREATE TABLE orders_denormalized (
  order_id INT64,
  customer_id INT64,
  customer_name STRING,          -- Embedded
  customer_email STRING,         -- Embedded
  amount NUMERIC
);

SELECT * FROM orders_denormalized;
```

### Pattern 2: Use Nested Arrays

```sql
-- ❌ Separate tables (requires JOIN)
CREATE TABLE orders (order_id INT64, customer_id INT64);
CREATE TABLE order_items (order_id INT64, product_id INT64, quantity INT64);

SELECT o.*, i.*
FROM orders o JOIN order_items i ON o.order_id = i.order_id;

-- ✅ Nested array (single table)
CREATE TABLE orders_with_items (
  order_id INT64,
  customer_id INT64,
  items ARRAY<STRUCT<
    product_id INT64,
    quantity INT64
  >>
);

SELECT order_id, item.product_id, item.quantity
FROM orders_with_items, UNNEST(items) as item;
```

### Pattern 3: Pre-join Dimension Tables

```sql
-- ❌ Star schema (multiple JOINs)
SELECT
  f.sale_amount,
  d.date_value,
  p.product_name,
  c.customer_name
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_key = p.product_key
JOIN dim_customer c ON f.customer_key = c.customer_key;

-- ✅ Denormalized fact table
CREATE TABLE sales_denormalized (
  sale_id INT64,
  sale_date DATE,
  product_name STRING,
  product_category STRING,
  customer_name STRING,
  customer_segment STRING,
  sale_amount NUMERIC
)
PARTITION BY sale_date
CLUSTER BY product_category, customer_segment;

SELECT * FROM sales_denormalized
WHERE sale_date = '2024-01-15';
```

## Schema Evolution

### Adding Columns

```sql
-- Add new column (always safe)
ALTER TABLE events ADD COLUMN new_field STRING;

-- Add nested field
ALTER TABLE events ADD COLUMN metadata STRUCT<
  source STRING,
  version STRING
>;
```

### Making Columns Nullable

```sql
-- Change from required to nullable
ALTER TABLE events ALTER COLUMN user_id DROP NOT NULL;
```

### Renaming Columns (Not Directly Supported)

```sql
-- Option 1: Create new table
CREATE TABLE events_v2 AS
SELECT
  event_id,
  user_id AS customer_id,  -- Renamed
  event_type
FROM events;

-- Option 2: Create view
CREATE VIEW events_renamed AS
SELECT
  event_id,
  user_id AS customer_id,
  event_type
FROM events;
```

### Changing Column Types (Limited)

```sql
-- Some conversions supported via CAST
-- For major changes, recreate table
CREATE TABLE events_v2 AS
SELECT
  event_id,
  CAST(user_id AS STRING) AS user_id,  -- INT64 to STRING
  event_type
FROM events;
```

## Best Practices

### Column Naming

```sql
-- ✅ Good: snake_case, descriptive
CREATE TABLE user_events (
  event_id INT64,
  user_id INT64,
  event_type STRING,
  event_timestamp TIMESTAMP,
  session_id STRING,
  page_url STRING,
  user_agent STRING
);

-- ❌ Avoid: CamelCase, abbreviations, generic names
CREATE TABLE UserEvents (
  id INT64,           -- Too generic
  uid INT64,          -- Unclear abbreviation
  type STRING,        -- Reserved word
  ts TIMESTAMP,       -- Unclear
  ua STRING           -- Unclear
);
```

### Use Appropriate Types

```sql
-- ✅ Good: Appropriate types
CREATE TABLE transactions (
  transaction_id INT64,              -- Integer ID
  amount NUMERIC(10, 2),             -- Exact decimal for money
  exchange_rate FLOAT64,             -- Approximation OK
  transaction_time TIMESTAMP,        -- Point in time
  is_refunded BOOL,                  -- Boolean flag
  metadata JSON                      -- Flexible structure
);

-- ❌ Avoid: String for everything
CREATE TABLE transactions_bad (
  transaction_id STRING,             -- Should be INT64
  amount STRING,                     -- Should be NUMERIC
  transaction_time STRING,           -- Should be TIMESTAMP
  is_refunded STRING                 -- Should be BOOL
);
```

### Nest Related Data

```sql
-- ✅ Good: Related data nested
CREATE TABLE web_sessions (
  session_id STRING,
  user_id INT64,
  started_at TIMESTAMP,
  device STRUCT<
    type STRING,
    os STRING,
    browser STRING,
    screen_resolution STRING
  >,
  location STRUCT<
    country STRING,
    region STRING,
    city STRING,
    timezone STRING
  >,
  page_views ARRAY<STRUCT<
    url STRING,
    title STRING,
    viewed_at TIMESTAMP,
    duration_seconds INT64
  >>
);
```

### Design for Query Patterns

```sql
-- If you frequently query by date range + region:
CREATE TABLE sales
(...)
PARTITION BY sale_date
CLUSTER BY region;

-- If you frequently filter by customer:
CREATE TABLE customer_events
(...)
PARTITION BY DATE(event_timestamp)
CLUSTER BY customer_id;

-- If you need both:
CREATE TABLE transactions
(...)
PARTITION BY DATE(transaction_timestamp)
CLUSTER BY customer_id, product_category;
```

## Common Patterns

### Event Table

```sql
CREATE TABLE events (
  event_id STRING,                   -- UUID
  event_type STRING,
  event_timestamp TIMESTAMP,
  user_id INT64,
  session_id STRING,
  properties JSON,                   -- Flexible properties
  context STRUCT<
    ip_address STRING,
    user_agent STRING,
    referrer STRING,
    utm_source STRING,
    utm_medium STRING,
    utm_campaign STRING
  >
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY event_type, user_id;
```

### User Profile Table

```sql
CREATE TABLE user_profiles (
  user_id INT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  profile STRUCT<
    email STRING,
    username STRING,
    full_name STRING,
    avatar_url STRING,
    bio STRING
  >,
  preferences STRUCT<
    language STRING,
    timezone STRING,
    notifications_enabled BOOL
  >,
  subscription STRUCT<
    plan STRING,
    started_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOL
  >,
  tags ARRAY<STRING>,
  custom_attributes JSON
)
CLUSTER BY user_id;
```

### Time Series Table

```sql
CREATE TABLE metrics (
  metric_name STRING,
  metric_timestamp TIMESTAMP,
  value FLOAT64,
  tags STRUCT<
    host STRING,
    environment STRING,
    service STRING,
    region STRING
  >
)
PARTITION BY DATE(metric_timestamp)
CLUSTER BY metric_name, tags.service;
```

### Audit Log Table

```sql
CREATE TABLE audit_logs (
  log_id STRING,
  timestamp TIMESTAMP,
  actor STRUCT<
    user_id INT64,
    email STRING,
    ip_address STRING,
    user_agent STRING
  >,
  action STRUCT<
    type STRING,
    resource_type STRING,
    resource_id STRING
  >,
  changes ARRAY<STRUCT<
    field STRING,
    old_value STRING,
    new_value STRING
  >>,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY action.type, actor.user_id;
```

## Anti-Patterns to Avoid

### 1. Over-Normalization

```sql
-- ❌ Too many tables requiring JOINs
SELECT ...
FROM orders o
JOIN customers c ON ...
JOIN addresses a ON ...
JOIN products p ON ...
JOIN categories cat ON ...
JOIN shipping s ON ...
-- Expensive! Data shuffling across nodes

-- ✅ Denormalize into single table with nested fields
```

### 2. Wide Tables Without Clustering

```sql
-- ❌ 100+ columns without structure
CREATE TABLE everything (
  col1 STRING,
  col2 STRING,
  ...
  col100 STRING
);

-- ✅ Group related columns into STRUCTs
CREATE TABLE organized (
  id INT64,
  user STRUCT<...>,
  order STRUCT<...>,
  payment STRUCT<...>
);
```

### 3. Storing Large BLOBs

```sql
-- ❌ Large binary data in BigQuery
CREATE TABLE documents (
  doc_id INT64,
  content BYTES  -- 10 MB PDF files
);

-- ✅ Store in GCS, reference in BigQuery
CREATE TABLE documents (
  doc_id INT64,
  gcs_uri STRING,  -- gs://bucket/path/file.pdf
  metadata JSON
);
```

## References

- Data Types: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
- Nested/Repeated: https://cloud.google.com/bigquery/docs/nested-repeated
- Schema Design: https://cloud.google.com/bigquery/docs/best-practices-performance-schema
