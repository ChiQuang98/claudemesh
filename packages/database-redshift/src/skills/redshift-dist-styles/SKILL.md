---
name: redshift-dist-styles
description: Amazon Redshift distribution style selection and optimization. Use when designing tables or optimizing data distribution across nodes.
allowed-tools: Read, Bash
user-invocable: true
---

# Redshift Distribution Styles

## Overview

Distribution style determines how data is distributed across compute nodes in a Redshift cluster. Choosing the right distribution style is critical for query performance and minimizing data movement during JOINs.

## Distribution Styles

### DISTSTYLE EVEN

Data is distributed round-robin across all slices, ensuring equal distribution.

```sql
CREATE TABLE events (
  event_id BIGINT,
  event_type VARCHAR(50),
  event_timestamp TIMESTAMP
)
DISTSTYLE EVEN
SORTKEY (event_timestamp);
```

**When to Use:**
- Table is not joined with other tables
- No clear distribution key candidate
- Need balanced data across nodes
- Aggregation-heavy workloads

**Pros:**
- Equal data distribution
- No skew issues
- Simple to implement

**Cons:**
- All JOINs require data redistribution
- Higher network traffic for joins

### DISTSTYLE KEY

Data is distributed based on a specific column's hash value. Rows with the same key value go to the same node.

```sql
CREATE TABLE orders (
  order_id BIGINT,
  customer_id BIGINT,
  order_date DATE,
  amount DECIMAL(18,2)
)
DISTSTYLE KEY
DISTKEY (customer_id)
SORTKEY (order_date);
```

**When to Use:**
- Table is frequently joined with other tables
- Clear join column exists
- Join column has high cardinality
- Want to co-locate joined data

**Pros:**
- Co-located JOINs (no redistribution)
- Faster joins between tables with same DISTKEY
- Reduced network traffic

**Cons:**
- Risk of data skew if key distribution is uneven
- Only one DISTKEY per table

### DISTSTYLE ALL

Entire table is copied to every compute node.

```sql
CREATE TABLE date_dim (
  date_key INT PRIMARY KEY,
  date_value DATE,
  year INT,
  quarter INT,
  month INT,
  day INT,
  day_of_week INT,
  is_holiday BOOLEAN
)
DISTSTYLE ALL
SORTKEY (date_value);
```

**When to Use:**
- Small dimension tables (< 2-3 million rows)
- Frequently joined tables
- Table is read-heavy, rarely updated
- Star schema dimension tables

**Pros:**
- JOINs are always local (no redistribution)
- Fast query performance
- Eliminates broadcast operations

**Cons:**
- Storage multiplied by node count
- Slow COPY/INSERT operations
- Updates affect all nodes

### DISTSTYLE AUTO

Redshift automatically chooses between ALL and EVEN based on table size.

```sql
CREATE TABLE products (
  product_id BIGINT,
  product_name VARCHAR(255),
  category VARCHAR(100)
)
DISTSTYLE AUTO;
```

**When to Use:**
- Unsure about optimal distribution
- Table size may change significantly
- Want Redshift to optimize automatically

**Behavior:**
- Small tables: ALL distribution
- Large tables: EVEN distribution
- Automatic rebalancing as table grows

## Choosing the Right Distribution Style

### Decision Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    Distribution Style Selection                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Is the table small (< 3M rows)?                               │
│  ├─ YES → Use DISTSTYLE ALL                                    │
│  └─ NO ↓                                                       │
│                                                                │
│  Is the table frequently joined?                               │
│  ├─ NO → Use DISTSTYLE EVEN                                    │
│  └─ YES ↓                                                      │
│                                                                │
│  Is there a good DISTKEY candidate?                            │
│  (High cardinality, frequently joined column)                  │
│  ├─ YES → Use DISTSTYLE KEY with that column                   │
│  └─ NO → Use DISTSTYLE EVEN                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### DISTKEY Selection Criteria

```sql
-- Good DISTKEY characteristics:
-- 1. High cardinality (many unique values)
-- 2. Even distribution (no single value dominates)
-- 3. Frequently used in JOINs
-- 4. Matches DISTKEY of joined tables

-- Check cardinality
SELECT COUNT(DISTINCT customer_id) as cardinality,
       COUNT(*) as total_rows,
       COUNT(DISTINCT customer_id) * 100.0 / COUNT(*) as uniqueness_pct
FROM orders;

-- Check distribution evenness
SELECT customer_id, COUNT(*) as row_count
FROM orders
GROUP BY customer_id
ORDER BY row_count DESC
LIMIT 20;

-- Check for skew
SELECT
  MIN(row_count) as min_rows,
  MAX(row_count) as max_rows,
  AVG(row_count) as avg_rows,
  MAX(row_count) * 1.0 / AVG(row_count) as skew_ratio
FROM (
  SELECT customer_id, COUNT(*) as row_count
  FROM orders
  GROUP BY customer_id
);
-- Skew ratio > 5 indicates potential issues
```

## Co-Located Joins

### Same DISTKEY = Co-Located Join

```sql
-- Both tables use customer_id as DISTKEY
CREATE TABLE customers (
  customer_id BIGINT,
  name VARCHAR(255)
)
DISTSTYLE KEY
DISTKEY (customer_id);

CREATE TABLE orders (
  order_id BIGINT,
  customer_id BIGINT,
  amount DECIMAL(18,2)
)
DISTSTYLE KEY
DISTKEY (customer_id);

-- This JOIN is co-located - no redistribution needed!
SELECT c.name, SUM(o.amount)
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.name;
```

### Join Requiring Redistribution

```sql
-- Different DISTKEYs or no DISTKEY
CREATE TABLE orders (
  order_id BIGINT,
  customer_id BIGINT
)
DISTSTYLE KEY
DISTKEY (customer_id);

CREATE TABLE order_items (
  item_id BIGINT,
  order_id BIGINT,
  product_id BIGINT
)
DISTSTYLE KEY
DISTKEY (product_id);  -- Different DISTKEY!

-- This JOIN requires redistribution
SELECT o.order_id, COUNT(oi.item_id)
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id;
-- Data must be redistributed by order_id
```

## Analyzing Distribution

### Check Table Distribution Style

```sql
-- Query system table
SELECT
  "table" as table_name,
  diststyle,
  sortkey1
FROM svv_table_info
WHERE schema = 'public'
ORDER BY "table";
```

### Analyze Data Skew

```sql
-- Check slice distribution for a table
SELECT
  slice,
  COUNT(*) as rows
FROM stv_blocklist
WHERE tbl = (SELECT tbl FROM stv_tbl_perm WHERE name = 'orders')
GROUP BY slice
ORDER BY slice;

-- Check for skew across slices
SELECT
  owner AS node,
  COUNT(*) AS rows
FROM stv_slices s
JOIN stv_blocklist b ON s.slice = b.slice
WHERE b.tbl = (SELECT tbl FROM stv_tbl_perm WHERE name = 'orders')
GROUP BY owner
ORDER BY owner;
```

### Monitor Query Performance

```sql
-- Find queries with high distribution cost
SELECT
  query,
  step,
  rows,
  bytes,
  label
FROM svl_query_summary
WHERE query = <query_id>
  AND label LIKE 'dist%'
ORDER BY step;

-- Identify redistribution operations
SELECT
  query,
  segment,
  step,
  label,
  rows,
  bytes
FROM stl_dist
WHERE query = <query_id>
ORDER BY segment, step;
```

## Common Patterns

### Star Schema

```sql
-- Fact table: DISTKEY on most common join column
CREATE TABLE fact_sales (
  sale_id BIGINT IDENTITY(1,1),
  date_key INT REFERENCES dim_date(date_key),
  product_key INT REFERENCES dim_product(product_key),
  customer_key INT REFERENCES dim_customer(customer_key),
  quantity INT,
  amount DECIMAL(18,2)
)
DISTSTYLE KEY
DISTKEY (customer_key)  -- Most frequent join
SORTKEY (date_key);

-- Small dimensions: DISTSTYLE ALL
CREATE TABLE dim_date (
  date_key INT PRIMARY KEY,
  date_value DATE,
  year INT,
  month INT,
  day INT
)
DISTSTYLE ALL
SORTKEY (date_value);

CREATE TABLE dim_product (
  product_key INT PRIMARY KEY,
  product_name VARCHAR(255),
  category VARCHAR(100)
)
DISTSTYLE ALL;

-- Large dimension: Match fact DISTKEY
CREATE TABLE dim_customer (
  customer_key INT PRIMARY KEY,
  customer_name VARCHAR(255),
  segment VARCHAR(50)
)
DISTSTYLE KEY
DISTKEY (customer_key);  -- Matches fact_sales
```

### Time-Series Data

```sql
-- Events table: EVEN distribution
-- (no good join key, aggregation-focused)
CREATE TABLE events (
  event_id BIGINT IDENTITY(1,1),
  event_timestamp TIMESTAMP,
  event_type VARCHAR(50),
  user_id BIGINT,
  payload VARCHAR(65535)
)
DISTSTYLE EVEN
SORTKEY (event_timestamp);

-- Aggregations benefit from parallel processing
SELECT
  DATE_TRUNC('hour', event_timestamp) as hour,
  event_type,
  COUNT(*) as event_count
FROM events
WHERE event_timestamp >= DATEADD(day, -7, CURRENT_DATE)
GROUP BY 1, 2;
```

## Changing Distribution Style

### Recreate Table

```sql
-- Create new table with different distribution
CREATE TABLE orders_new (
  order_id BIGINT,
  customer_id BIGINT,
  amount DECIMAL(18,2)
)
DISTSTYLE KEY
DISTKEY (customer_id)
SORTKEY (order_id);

-- Copy data
INSERT INTO orders_new
SELECT * FROM orders;

-- Swap tables
BEGIN TRANSACTION;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;

-- Drop old table
DROP TABLE orders_old;
```

### Using ALTER TABLE (Limited)

```sql
-- Change to EVEN (if currently KEY or ALL)
ALTER TABLE orders ALTER DISTSTYLE EVEN;

-- Change to ALL (if table is small enough)
ALTER TABLE orders ALTER DISTSTYLE ALL;

-- Change DISTKEY
ALTER TABLE orders ALTER DISTKEY customer_id;
```

## Best Practices Checklist

### Design Phase
- [ ] Identify frequently joined tables
- [ ] Analyze join patterns
- [ ] Check column cardinality for DISTKEY candidates
- [ ] Plan co-located joins

### DISTKEY Selection
- [ ] High cardinality column
- [ ] Even distribution (no hot values)
- [ ] Matches DISTKEY of joined tables
- [ ] Consider most common join scenario

### Dimension Tables
- [ ] Use DISTSTYLE ALL for small dimensions (< 3M rows)
- [ ] Match fact table DISTKEY for large dimensions
- [ ] Minimize update frequency for ALL tables

### Monitoring
- [ ] Check for data skew regularly
- [ ] Monitor redistribution in query plans
- [ ] Review slow queries for distribution issues
- [ ] Validate distribution after data loads

## Troubleshooting

### High Skew Detected

```sql
-- Problem: One customer has 50% of orders
-- Solution 1: Choose different DISTKEY
ALTER TABLE orders ALTER DISTKEY order_id;

-- Solution 2: Use EVEN distribution
ALTER TABLE orders ALTER DISTSTYLE EVEN;
```

### JOINs Are Slow

```sql
-- Check if redistribution is occurring
EXPLAIN SELECT ...
-- Look for DS_DIST_ALL_NONE, DS_DIST_INNER, DS_DIST_OUTER

-- Solution: Co-locate tables with same DISTKEY
```

### DISTSTYLE ALL Table Is Slow to Load

```sql
-- Problem: INSERT/COPY is slow
-- Cause: Data copied to all nodes

-- Solution: Use DISTSTYLE KEY or EVEN for frequently updated tables
-- Or: Load to staging table, then swap
```

## References

- Distribution Styles: https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html
- Best Practices: https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-best-dist-key.html
- System Tables: https://docs.aws.amazon.com/redshift/latest/dg/cm_chap_system-tables.html
