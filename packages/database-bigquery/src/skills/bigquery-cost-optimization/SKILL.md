---
name: bigquery-cost-optimization
description: Google BigQuery cost optimization techniques and strategies. Use when trying to reduce BigQuery query costs or analyze spending.
allowed-tools: Read, Bash
user-invocable: true
---

# BigQuery Cost Optimization

## Overview

Google BigQuery charges **$5 per TB of data scanned** for on-demand pricing. With the right optimizations, you can reduce costs by 90-99% while also improving query performance.

## Cost Model

### On-Demand Pricing

```
Cost = Data Scanned (TB) × $5

Examples:
- 1 GB scanned = $0.005
- 10 GB scanned = $0.05
- 100 GB scanned = $0.50
- 1 TB scanned = $5.00
- 10 TB scanned = $50.00
```

### Capacity-Based Pricing (Slots)

```
Cost = Number of Slots × $0.04/slot-hour (on-demand)
     = Number of Slots × ~$2,000/slot-month (commitment)

When to use slots:
- Predictable, high-volume workloads
- Cost exceeds equivalent slot pricing
- Need guaranteed capacity
```

## The Cost Reduction Formula

```
Optimization Stack:
1. Partitioning: 90% reduction
2. Clustering: 50-80% additional reduction
3. Column selection: Variable (depends on schema)
4. Query caching: 100% for repeated queries
5. Materialized views: 90%+ for common aggregations

Combined: 95-99% total reduction!
```

## Priority 1: Partitioning (Highest Impact)

### Time-Based Partitioning

```sql
-- Create partitioned table
CREATE TABLE `project.dataset.events`
(
  event_id INT64,
  user_id INT64,
  event_type STRING,
  event_timestamp TIMESTAMP,
  payload STRING
)
PARTITION BY DATE(event_timestamp)
OPTIONS (
  partition_expiration_days = 365,
  require_partition_filter = true
);

-- Query with partition filter (scans 1 day)
SELECT COUNT(*) FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15';
-- Cost: ~$0.01 (1 GB)

-- Without partition filter (scans all data)
SELECT COUNT(*) FROM `project.dataset.events`
WHERE user_id = 123;
-- Cost: ~$5.00 (1 TB) - ERROR if require_partition_filter = true
```

### Integer Range Partitioning

```sql
-- Partition by customer ID ranges
CREATE TABLE `project.dataset.customer_data`
(
  customer_id INT64,
  data STRING
)
PARTITION BY RANGE_BUCKET(customer_id, GENERATE_ARRAY(0, 1000000, 10000));

-- Query specific customer range
SELECT * FROM `project.dataset.customer_data`
WHERE customer_id BETWEEN 10000 AND 19999;
-- Only scans 1 partition
```

## Priority 2: Clustering (High Impact)

```sql
-- Create clustered table
CREATE TABLE `project.dataset.sales`
(
  sale_id INT64,
  sale_date DATE,
  region STRING,
  product_id INT64,
  amount FLOAT64
)
PARTITION BY sale_date
CLUSTER BY region, product_id;

-- Efficient query (uses clustering)
SELECT SUM(amount) FROM `project.dataset.sales`
WHERE sale_date = '2024-01-15'
  AND region = 'US'
  AND product_id = 12345;
-- Scans minimal data blocks

-- Clustering best practices:
-- 1. Order columns by filter frequency
-- 2. Use 1-4 columns
-- 3. High cardinality columns benefit most
-- 4. Combine with partitioning
```

## Priority 3: Column Selection

```sql
-- ❌ Bad: SELECT * scans all columns
SELECT *
FROM `project.dataset.wide_table`;
-- Scans: 100 GB (all 50 columns)
-- Cost: $0.50

-- ✅ Good: Select only needed columns
SELECT user_id, event_type, timestamp
FROM `project.dataset.wide_table`;
-- Scans: 6 GB (3 columns)
-- Cost: $0.03
-- Savings: 94%
```

### Calculate Column Cost

```sql
-- Check column sizes
SELECT
  column_name,
  SUM(size_bytes) / 1024 / 1024 / 1024 as size_gb
FROM `project.dataset.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS`
WHERE table_name = 'your_table'
GROUP BY column_name
ORDER BY size_gb DESC;
```

## Priority 4: Query Caching

### How Caching Works

```sql
-- First query: Scans data, caches result (24 hours)
SELECT COUNT(*) FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15';
-- Cost: $0.05
-- Time: 5s

-- Second identical query: Uses cache
SELECT COUNT(*) FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15';
-- Cost: $0.00 (FREE!)
-- Time: <1s
```

### Cache Invalidation

Cache is invalidated when:
- Source data changes
- Query text changes (including whitespace!)
- 24 hours elapsed
- Non-deterministic functions used (CURRENT_TIMESTAMP, RAND)

### Optimize for Caching

```sql
-- ❌ Bad: Non-deterministic function
SELECT * FROM `project.dataset.events`
WHERE event_timestamp > CURRENT_TIMESTAMP();
-- Never cached

-- ✅ Good: Fixed timestamp
SELECT * FROM `project.dataset.events`
WHERE event_timestamp > TIMESTAMP '2024-01-15 00:00:00';
-- Cached for 24 hours
```

## Priority 5: Materialized Views

```sql
-- Create materialized view for common aggregation
CREATE MATERIALIZED VIEW `project.dataset.daily_sales_summary`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 60
)
AS
SELECT
  DATE(sale_timestamp) as sale_date,
  region,
  product_category,
  COUNT(*) as sale_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM `project.dataset.sales`
GROUP BY sale_date, region, product_category;

-- Query materialized view (much cheaper)
SELECT * FROM `project.dataset.daily_sales_summary`
WHERE sale_date = '2024-01-15'
  AND region = 'US';
-- Scans pre-computed summary instead of raw data
```

### When to Use Materialized Views

- Frequently run aggregation queries
- Data doesn't change frequently
- Query patterns are predictable
- Refresh cost < repeated query cost

## Dry Run for Cost Estimation

```sql
-- Check bytes processed before running
-- In BigQuery Console: Click "Validator" or use API

-- Via bq command line
bq query --dry_run --use_legacy_sql=false \
  'SELECT * FROM `project.dataset.large_table` WHERE date = "2024-01-15"'

-- Output shows: This query will process X bytes when run.
```

## Query Optimization Patterns

### Avoid Full Table Scans

```sql
-- ❌ Bad: Scans entire table
SELECT user_id, MAX(event_timestamp)
FROM `project.dataset.events`
GROUP BY user_id;

-- ✅ Good: Add partition filter
SELECT user_id, MAX(event_timestamp)
FROM `project.dataset.events`
WHERE DATE(event_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY user_id;
```

### Optimize JOINs

```sql
-- ❌ Bad: Join before filter
SELECT a.*, b.*
FROM large_table a
JOIN small_table b ON a.id = b.id;

-- ✅ Good: Filter before join
SELECT a.*, b.*
FROM (
  SELECT * FROM large_table
  WHERE date_partition = '2024-01-15'
) a
JOIN small_table b ON a.id = b.id;
```

### Use APPROX Functions

```sql
-- ❌ Expensive: Exact count distinct
SELECT COUNT(DISTINCT user_id) FROM events;

-- ✅ Cheaper: Approximate (2% error)
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;
-- 10x faster, same cost but less slot time
```

## Cost Monitoring

### Set Up Budget Alerts

```sql
-- In Google Cloud Console:
-- 1. Billing → Budgets & alerts
-- 2. Create budget for BigQuery
-- 3. Set threshold alerts (50%, 90%, 100%)
```

### Query Cost Analysis

```sql
-- Find expensive queries (last 7 days)
SELECT
  user_email,
  query,
  total_bytes_billed / 1024 / 1024 / 1024 as gb_billed,
  (total_bytes_billed / 1024 / 1024 / 1024 / 1024) * 5 as estimated_cost_usd,
  creation_time
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
ORDER BY total_bytes_billed DESC
LIMIT 100;
```

### Custom Quotas

```sql
-- Set project-level quotas in Cloud Console:
-- 1. IAM & Admin → Quotas
-- 2. Filter: BigQuery
-- 3. Set daily query usage limit
-- 4. Set per-user limits
```

## Slot Management (Capacity Pricing)

### When to Switch to Slots

```
On-demand cost per month: $X
Equivalent slots needed: $X / (730 hours × $0.04) = N slots

If you need > N slots worth of queries, consider:
- Flex slots (short-term, $0.04/slot-hour)
- Monthly commitment (~$2,000/slot)
- Annual commitment (~$1,700/slot)
```

### Slot Reservations

```sql
-- Create reservation
-- In BigQuery Admin or via API:
{
  "slotCapacity": 500,
  "ignoreIdleSlots": false
}

-- Assign projects to reservation
-- Ensures predictable performance and cost
```

## Best Practices Checklist

### Query Design
- [ ] Never use SELECT * in production
- [ ] Always include partition filters
- [ ] Use clustering columns in WHERE
- [ ] Leverage query caching
- [ ] Use approximate functions when acceptable

### Table Design
- [ ] Partition all large tables (>1 GB)
- [ ] Cluster frequently filtered columns
- [ ] Set partition expiration
- [ ] Enable require_partition_filter for critical tables

### Monitoring
- [ ] Set up budget alerts
- [ ] Review expensive queries weekly
- [ ] Track bytes billed trends
- [ ] Audit user query patterns

### Advanced
- [ ] Create materialized views for common aggregations
- [ ] Use scheduled queries for off-peak processing
- [ ] Consider slots for predictable workloads
- [ ] Implement BI Engine for dashboards

## Quick Reference

| Optimization | Impact | Difficulty |
|--------------|--------|------------|
| Add partitions | 90-99% | Easy |
| Add clustering | 50-80% | Easy |
| Select specific columns | 50-90% | Easy |
| Use query caching | 100% for repeats | Easy |
| Materialized views | 90%+ | Medium |
| Switch to slots | Variable | Medium |

## References

- BigQuery Pricing: https://cloud.google.com/bigquery/pricing
- Cost Optimization: https://cloud.google.com/bigquery/docs/best-practices-costs
- Quotas and Limits: https://cloud.google.com/bigquery/quotas
