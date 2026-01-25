---
name: redshift-sort-keys
description: Amazon Redshift sort key design and optimization strategies. Use when designing tables or optimizing query performance through sorting.
allowed-tools: Read, Bash
user-invocable: true
---

# Redshift Sort Keys

## Overview

Sort keys determine the physical order of data on disk. Proper sort key design enables Redshift to skip entire data blocks during queries, dramatically improving performance for filtered and ordered queries.

## How Sort Keys Work

### Zone Maps

Redshift stores min/max values for each 1 MB data block (zone map). When filtering:

```
Block 1: date_range [2024-01-01, 2024-01-10] → SKIP (not in range)
Block 2: date_range [2024-01-11, 2024-01-20] → SCAN (contains 2024-01-15)
Block 3: date_range [2024-01-21, 2024-01-31] → SKIP (not in range)

Query: WHERE order_date = '2024-01-15'
Result: Only Block 2 scanned (66% reduction)
```

### Sort Key Impact

```
Without sort key:
- All blocks scanned
- Zone maps have overlapping ranges
- Full table scan required

With sort key:
- Data physically sorted
- Zone maps have distinct ranges
- Block skipping enabled
```

## Sort Key Types

### Compound Sort Key

Columns must be queried in order (left to right) for sort key benefits.

```sql
CREATE TABLE orders (
  order_id BIGINT,
  order_date DATE,
  customer_id BIGINT,
  region VARCHAR(50),
  amount DECIMAL(18,2)
)
SORTKEY (order_date, region, customer_id);

-- ✅ Uses sort key (prefix columns)
SELECT * FROM orders WHERE order_date = '2024-01-15';
SELECT * FROM orders WHERE order_date = '2024-01-15' AND region = 'US';
SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';

-- ✅ Partial benefit (first column)
SELECT * FROM orders WHERE order_date = '2024-01-15' AND customer_id = 123;

-- ❌ Does NOT use sort key (skips first column)
SELECT * FROM orders WHERE region = 'US';
SELECT * FROM orders WHERE customer_id = 123;

-- ❌ Does NOT use sort key (wrong order)
SELECT * FROM orders WHERE region = 'US' AND order_date = '2024-01-15';
```

**When to Use:**
- Predictable query patterns
- Date-range queries are common
- Filters always include leading columns
- ORDER BY matches sort key

### Interleaved Sort Key

Multiple columns with equal importance. Any column can be used for filtering.

```sql
CREATE TABLE events (
  event_id BIGINT,
  event_timestamp TIMESTAMP,
  user_id BIGINT,
  event_type VARCHAR(50),
  data VARCHAR(65535)
)
INTERLEAVED SORTKEY (event_timestamp, user_id, event_type);

-- ✅ All queries benefit
SELECT * FROM events WHERE event_timestamp >= '2024-01-15';
SELECT * FROM events WHERE user_id = 12345;
SELECT * FROM events WHERE event_type = 'click';
SELECT * FROM events WHERE user_id = 12345 AND event_type = 'click';
```

**When to Use:**
- Unpredictable query patterns
- Multiple filter columns
- Ad-hoc queries
- No dominant access pattern

**Trade-offs:**
- More expensive VACUUM
- Slightly less efficient than compound for single pattern
- Up to 8 columns supported

### AUTO Sort Key

Redshift automatically chooses and maintains sort key.

```sql
CREATE TABLE logs (
  log_id BIGINT,
  log_timestamp TIMESTAMP,
  message VARCHAR(65535)
)
SORTKEY AUTO;

-- Redshift analyzes query patterns and optimizes
```

**When to Use:**
- Unknown query patterns
- Want hands-off optimization
- Testing before manual optimization

## Choosing Sort Key Columns

### Primary Sort Key Criteria

```sql
-- 1. Frequently filtered columns
-- Check common WHERE clauses
SELECT * FROM events WHERE order_date = '2024-01-15';  -- order_date is candidate

-- 2. Range query columns
SELECT * FROM events WHERE timestamp BETWEEN '2024-01-01' AND '2024-01-31';

-- 3. Columns with sequential values
-- Dates, timestamps, auto-increment IDs

-- 4. Columns used in JOINs
SELECT * FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;
```

### Analyze Query Patterns

```sql
-- Find most filtered columns
SELECT
  TRIM(querytxt) as query,
  COUNT(*) as execution_count
FROM stl_query
WHERE database = 'your_database'
  AND querytxt LIKE '%WHERE%'
GROUP BY querytxt
ORDER BY execution_count DESC
LIMIT 100;

-- Identify columns in WHERE clauses
-- Look for patterns: date filters, ID filters, status filters
```

### Column Order for Compound Keys

```sql
-- Order by filter frequency (most filtered first)
-- Typical patterns:

-- Time-series data:
SORTKEY (event_date, event_type, user_id)

-- Customer-centric:
SORTKEY (customer_id, order_date)

-- Multi-tenant:
SORTKEY (tenant_id, created_at)

-- Status-based:
SORTKEY (status, updated_at)
```

## Common Patterns

### Time-Series Pattern

```sql
-- Log/event tables with date-based queries
CREATE TABLE application_logs (
  log_id BIGINT IDENTITY(1,1),
  log_timestamp TIMESTAMP,
  log_level VARCHAR(10),
  service VARCHAR(50),
  message VARCHAR(65535)
)
DISTSTYLE EVEN
SORTKEY (log_timestamp);

-- Efficient queries
SELECT * FROM application_logs
WHERE log_timestamp >= DATEADD(hour, -24, GETDATE())
  AND log_level = 'ERROR';
-- Sort key: log_timestamp (range filter)
```

### Date + Category Pattern

```sql
-- Sales/transactions with date and category filters
CREATE TABLE sales (
  sale_id BIGINT,
  sale_date DATE,
  region VARCHAR(50),
  product_category VARCHAR(100),
  amount DECIMAL(18,2)
)
DISTSTYLE EVEN
SORTKEY (sale_date, region);

-- Efficient queries
SELECT SUM(amount) FROM sales
WHERE sale_date = '2024-01-15' AND region = 'US';

SELECT * FROM sales
WHERE sale_date BETWEEN '2024-01-01' AND '2024-01-31';
```

### Multi-Tenant Pattern

```sql
-- SaaS applications with tenant isolation
CREATE TABLE tenant_data (
  record_id BIGINT,
  tenant_id INT,
  created_at TIMESTAMP,
  data VARCHAR(65535)
)
DISTSTYLE KEY
DISTKEY (tenant_id)
SORTKEY (tenant_id, created_at);

-- Efficient queries
SELECT * FROM tenant_data
WHERE tenant_id = 123
  AND created_at >= DATEADD(day, -7, GETDATE());
```

### Flexible Query Pattern

```sql
-- Ad-hoc analytics with variable filters
CREATE TABLE user_events (
  event_id BIGINT,
  user_id BIGINT,
  event_timestamp TIMESTAMP,
  event_type VARCHAR(50),
  platform VARCHAR(20),
  country VARCHAR(2)
)
INTERLEAVED SORTKEY (event_timestamp, user_id, event_type, platform);

-- All efficient
SELECT * FROM user_events WHERE event_timestamp = '2024-01-15';
SELECT * FROM user_events WHERE user_id = 12345;
SELECT * FROM user_events WHERE event_type = 'purchase';
SELECT * FROM user_events WHERE platform = 'iOS' AND country = 'US';
```

## Maintaining Sort Order

### VACUUM for Compound Sort Keys

```sql
-- Check sort health
SELECT
  "table" as table_name,
  unsorted as unsorted_pct,
  size as size_mb,
  tbl_rows as rows
FROM svv_table_info
WHERE schema = 'public'
ORDER BY unsorted DESC;

-- Tables with >5% unsorted need VACUUM
VACUUM orders;

-- Full vacuum (rewrite entire table)
VACUUM FULL orders;

-- Delete-only vacuum (reclaim space)
VACUUM DELETE ONLY orders;
```

### VACUUM for Interleaved Sort Keys

```sql
-- More expensive than compound sort key
VACUUM REINDEX orders;

-- Required after significant data changes
-- Consider during maintenance windows
```

### Automatic Vacuum

```sql
-- Redshift runs automatic vacuum during low activity
-- Monitor vacuum progress:
SELECT
  table_name,
  status,
  rows_sorted,
  sortedrow_pct,
  elapsed_seconds
FROM svv_vacuum_progress;
```

## Analyze Query Performance

### Check Sort Key Usage

```sql
-- Use EXPLAIN to see sort key benefits
EXPLAIN
SELECT * FROM orders
WHERE order_date = '2024-01-15';

-- Look for:
-- "Filter: ..." with zone map elimination
-- Low "rows" estimate = good sort key usage
```

### Monitor Sort Key Effectiveness

```sql
-- Check how much data is scanned
SELECT
  query,
  tbl,
  pct_skipped,
  pct_scanned
FROM svl_query_summary
WHERE query = <query_id>;

-- High pct_skipped = sort key working well
```

### Find Tables Needing Sort Keys

```sql
-- Tables with high scan ratios
SELECT
  t.table_name,
  s.query,
  s.rows,
  s.bytes,
  (s.bytes / 1024 / 1024) as mb_scanned
FROM stl_scan s
JOIN stv_tbl_perm t ON s.tbl = t.id
WHERE s.query > 0
  AND (s.bytes / 1024 / 1024) > 1000  -- >1 GB scanned
ORDER BY s.bytes DESC
LIMIT 20;
```

## Changing Sort Keys

### Recreate Table

```sql
-- Best approach for production tables
-- 1. Create new table with new sort key
CREATE TABLE orders_new (
  order_id BIGINT,
  order_date DATE,
  customer_id BIGINT,
  amount DECIMAL(18,2)
)
DISTSTYLE KEY
DISTKEY (customer_id)
SORTKEY (order_date, customer_id);  -- New sort key

-- 2. Copy data (automatically sorted)
INSERT INTO orders_new
SELECT * FROM orders;

-- 3. Swap tables
BEGIN TRANSACTION;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;

-- 4. Clean up
DROP TABLE orders_old;
```

### Using ALTER TABLE

```sql
-- Add sort key to existing table
ALTER TABLE orders
ALTER SORTKEY (order_date, customer_id);

-- Change to compound sort key
ALTER TABLE orders
ALTER COMPOUND SORTKEY (order_date, region);

-- Change to interleaved sort key
ALTER TABLE orders
ALTER INTERLEAVED SORTKEY (order_date, region, customer_id);

-- Note: This can be slow for large tables
```

## Best Practices Checklist

### Design Phase
- [ ] Analyze query patterns
- [ ] Identify frequently filtered columns
- [ ] Choose compound vs interleaved based on access patterns
- [ ] Plan sort key column order

### Compound Sort Keys
- [ ] Most frequently filtered column first
- [ ] Date/timestamp columns for time-based queries
- [ ] Match ORDER BY patterns
- [ ] Limit to 4-6 columns

### Interleaved Sort Keys
- [ ] Use for ad-hoc query patterns
- [ ] Limit to 4-8 columns
- [ ] Plan for more frequent VACUUM REINDEX
- [ ] Monitor maintenance overhead

### Maintenance
- [ ] Monitor unsorted percentage
- [ ] Schedule VACUUM operations
- [ ] Track sort key effectiveness
- [ ] Review and adjust as query patterns change

## Anti-Patterns to Avoid

### Wrong Column Order

```sql
-- ❌ Bad: Queries filter by date, but date is second
SORTKEY (region, order_date);
SELECT * FROM orders WHERE order_date = '2024-01-15';
-- Sort key not used effectively

-- ✅ Good: Date first for date-filtered queries
SORTKEY (order_date, region);
```

### Too Many Columns

```sql
-- ❌ Bad: Too many interleaved columns
INTERLEAVED SORTKEY (a, b, c, d, e, f, g, h, i, j);
-- Maintenance nightmare, diminishing returns

-- ✅ Good: Focus on most important columns
INTERLEAVED SORTKEY (event_date, user_id, event_type);
```

### Ignoring Maintenance

```sql
-- ❌ Bad: Never vacuuming
-- Sort order degrades, queries slow down

-- ✅ Good: Regular maintenance
-- Schedule VACUUM during low-activity periods
VACUUM orders;
```

## References

- Sort Keys: https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-sort-key.html
- VACUUM: https://docs.aws.amazon.com/redshift/latest/dg/r_VACUUM_command.html
- Query Analysis: https://docs.aws.amazon.com/redshift/latest/dg/c-query-analysis.html
