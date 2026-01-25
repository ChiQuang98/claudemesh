---
name: bigquery-partitioning
description: Google BigQuery partition design and optimization strategies. Use when designing partition schemes or optimizing partition performance.
allowed-tools: Read, Bash
user-invocable: true
---

# BigQuery Partitioning Strategies

## Overview

Partitioning is the most critical optimization technique in BigQuery. Proper partition design can reduce query costs by 90%+ and improve performance dramatically.

## Key Concepts

### What is Partitioning?

Partitioning divides your table into segments based on a column value. BigQuery can skip entire partitions during queries, reducing data scanned and costs.

**Cost Impact**:
- Without partitions: Scans entire table ($5 per TB)
- With partitions: Scans only relevant partitions (often 100x less)

### Partition Types

1. **Time-unit column partitioning** - Partition by DATE, TIMESTAMP, or DATETIME
2. **Ingestion time partitioning** - Partition by data load time
3. **Integer range partitioning** - Partition by integer column ranges

## Time-Unit Column Partitioning

### Daily Partitions (Most Common)

```sql
-- Create table with daily partitions
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

-- Query specific day (only scans 1 partition)
SELECT COUNT(*) FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15';

-- Query date range (scans multiple partitions)
SELECT COUNT(*) FROM `project.dataset.events`
WHERE DATE(event_timestamp) BETWEEN '2024-01-01' AND '2024-01-31';
```

### Hourly Partitions

```sql
-- For high-volume data (>10 GB/day)
CREATE TABLE `project.dataset.logs`
(
  log_id INT64,
  message STRING,
  log_timestamp TIMESTAMP
)
PARTITION BY TIMESTAMP_TRUNC(log_timestamp, HOUR);

-- Query specific hour
SELECT * FROM `project.dataset.logs`
WHERE TIMESTAMP_TRUNC(log_timestamp, HOUR) = '2024-01-15 10:00:00';
```

### Monthly Partitions

```sql
-- For low-volume or historical data
CREATE TABLE `project.dataset.reports`
(
  report_id INT64,
  data STRING,
  report_date DATE
)
PARTITION BY DATE_TRUNC(report_date, MONTH);

-- Query specific month
SELECT * FROM `project.dataset.reports`
WHERE DATE_TRUNC(report_date, MONTH) = '2024-01-01';
```

### Yearly Partitions

```sql
-- For archival data
CREATE TABLE `project.dataset.archive`
(
  record_id INT64,
  data STRING,
  created_date DATE
)
PARTITION BY DATE_TRUNC(created_date, YEAR);
```

## Ingestion Time Partitioning

```sql
-- Partition by when data was loaded
CREATE TABLE `project.dataset.streaming_events`
(
  event_id INT64,
  data STRING
)
PARTITION BY _PARTITIONDATE;

-- Special pseudo-columns available:
-- _PARTITIONTIME: TIMESTAMP of partition
-- _PARTITIONDATE: DATE of partition

-- Query by ingestion date
SELECT * FROM `project.dataset.streaming_events`
WHERE _PARTITIONDATE = '2024-01-15';
```

**When to Use**:
- Streaming inserts
- No reliable timestamp in data
- Need to track data freshness

## Integer Range Partitioning

```sql
-- Partition by customer ID ranges
CREATE TABLE `project.dataset.customer_data`
(
  customer_id INT64,
  customer_name STRING,
  data STRING
)
PARTITION BY RANGE_BUCKET(customer_id, GENERATE_ARRAY(0, 1000000, 10000));

-- Creates partitions: 0-9999, 10000-19999, ..., 990000-999999

-- Query specific range (scans 1 partition)
SELECT * FROM `project.dataset.customer_data`
WHERE customer_id BETWEEN 10000 AND 19999;
```

**When to Use**:
- Non-time-based filtering patterns
- ID-based data access
- Tenant isolation

## Partition Best Practices

### Optimal Partition Size

```
Target: 1 GB - 10 GB per partition

Too Small (< 100 MB):
- High metadata overhead
- Query planning slower
- More partitions to manage

Too Large (> 100 GB):
- Still scanning too much data
- Longer query times
- Reduced cost savings
```

### Partition Size Calculator

```python
# Choose partition granularity based on data volume
daily_volume_gb = 50  # Your daily data volume

if daily_volume_gb < 0.1:
    granularity = "MONTH"  # ~3 GB/partition
elif daily_volume_gb < 1:
    granularity = "WEEK"   # ~7 GB/partition (custom implementation)
elif daily_volume_gb < 100:
    granularity = "DAY"    # Use as-is
else:
    granularity = "HOUR"   # ~4 GB/partition

print(f"Recommended: {granularity} partitions")
```

### Require Partition Filter

```sql
-- Prevent full table scans
CREATE TABLE `project.dataset.critical_data`
(...)
PARTITION BY DATE(timestamp)
OPTIONS (
  require_partition_filter = true
);

-- Now this query will ERROR:
SELECT * FROM `project.dataset.critical_data`
WHERE user_id = 123;
-- Error: Cannot query over table 'critical_data' without a filter over column(s)
-- 'timestamp' that can be used for partition elimination

-- This works:
SELECT * FROM `project.dataset.critical_data`
WHERE DATE(timestamp) = '2024-01-15'
  AND user_id = 123;
```

### Partition Expiration

```sql
-- Auto-delete old partitions
CREATE TABLE `project.dataset.logs`
(...)
PARTITION BY DATE(timestamp)
OPTIONS (
  partition_expiration_days = 90  -- Delete after 90 days
);

-- Update expiration on existing table
ALTER TABLE `project.dataset.logs`
SET OPTIONS (
  partition_expiration_days = 60
);
```

## Query Patterns

### Good Queries (Use Partition Pruning)

```sql
-- Equality on partition column
SELECT * FROM events
WHERE DATE(event_timestamp) = '2024-01-15';

-- Range on partition column
SELECT * FROM events
WHERE DATE(event_timestamp) BETWEEN '2024-01-01' AND '2024-01-31';

-- IN clause
SELECT * FROM events
WHERE DATE(event_timestamp) IN ('2024-01-15', '2024-01-16', '2024-01-17');
```

### Bad Queries (Skip Partition Pruning)

```sql
-- ❌ No partition filter
SELECT * FROM events
WHERE user_id = 123;
-- Scans ALL partitions

-- ❌ Function that prevents pruning
SELECT * FROM events
WHERE EXTRACT(YEAR FROM event_timestamp) = 2024;
-- Can't use partition pruning

-- ❌ Partition column in OR with non-partition column
SELECT * FROM events
WHERE DATE(event_timestamp) = '2024-01-15'
   OR user_id = 123;
-- May scan all partitions
```

### Converting Timestamp Filters

```sql
-- ❌ Bad: Direct timestamp comparison
SELECT * FROM events
WHERE event_timestamp >= TIMESTAMP '2024-01-15 00:00:00'
  AND event_timestamp < TIMESTAMP '2024-01-16 00:00:00';
-- May not use partition pruning effectively

-- ✅ Good: Explicit DATE filter
SELECT * FROM events
WHERE DATE(event_timestamp) = '2024-01-15'
  AND event_timestamp >= TIMESTAMP '2024-01-15 00:00:00'
  AND event_timestamp < TIMESTAMP '2024-01-16 00:00:00';
-- Guaranteed partition pruning
```

## Partition Management

### View Partition Information

```sql
-- List partitions and sizes
SELECT
  partition_id,
  total_rows,
  total_logical_bytes / 1024 / 1024 / 1024 as size_gb
FROM `project.dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'events'
ORDER BY partition_id DESC
LIMIT 100;
```

### Delete Specific Partitions

```sql
-- Delete data from specific partition
DELETE FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-01';

-- Or use partition decorator (legacy SQL style)
-- bq rm -t 'project:dataset.events$20240101'
```

### Copy Partitions

```sql
-- Copy partition to another table
INSERT INTO `project.dataset.events_backup`
SELECT * FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15';
```

## Combining Partitioning with Clustering

```sql
-- Maximum optimization: Partition + Cluster
CREATE TABLE `project.dataset.sales`
(
  sale_id INT64,
  sale_timestamp TIMESTAMP,
  region STRING,
  product_id INT64,
  customer_id INT64,
  amount FLOAT64
)
PARTITION BY DATE(sale_timestamp)
CLUSTER BY region, product_id, customer_id;

-- Optimal query pattern
SELECT SUM(amount)
FROM `project.dataset.sales`
WHERE DATE(sale_timestamp) = '2024-01-15'  -- Partition pruning
  AND region = 'US'                          -- Cluster pruning
  AND product_id = 12345;                    -- Cluster pruning
-- Scans minimal data
```

### Clustering Column Order

```sql
-- Order by filter frequency
CLUSTER BY region, product_id, customer_id

-- Most filtered column first
-- Up to 4 columns
-- High cardinality columns benefit most
```

## Advanced Patterns

### Rolling Window Table

```sql
-- Keep only last N days
CREATE TABLE `project.dataset.recent_events`
(...)
PARTITION BY DATE(event_timestamp)
OPTIONS (
  partition_expiration_days = 30
);

-- Query always hits recent data only
SELECT * FROM `project.dataset.recent_events`
WHERE DATE(event_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);
```

### Archival Pattern

```sql
-- Hot table: Daily partitions, 90 days retention
CREATE TABLE `project.dataset.events_hot`
(...)
PARTITION BY DATE(event_timestamp)
OPTIONS (partition_expiration_days = 90);

-- Cold table: Monthly partitions, no expiration
CREATE TABLE `project.dataset.events_cold`
(...)
PARTITION BY DATE_TRUNC(event_timestamp, MONTH);

-- Archive job (scheduled query)
INSERT INTO `project.dataset.events_cold`
SELECT * FROM `project.dataset.events_hot`
WHERE DATE(event_timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);
```

### Multi-Tenant Partitioning

```sql
-- Partition by tenant for data isolation
CREATE TABLE `project.dataset.tenant_data`
(
  tenant_id INT64,
  data STRING,
  created_at TIMESTAMP
)
PARTITION BY RANGE_BUCKET(tenant_id, GENERATE_ARRAY(0, 10000, 100))
CLUSTER BY created_at;

-- Query single tenant (1 partition)
SELECT * FROM `project.dataset.tenant_data`
WHERE tenant_id = 500
  AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR);
```

## Partition Limits

```
BigQuery Partition Limits:
- Max partitions per table: 10,000
- Max partitions per operation: 4,000
- Partition column types: DATE, TIMESTAMP, DATETIME, INT64
- Time partitioning granularity: HOUR, DAY, MONTH, YEAR
```

## Migration: Non-Partitioned to Partitioned

```sql
-- Create new partitioned table
CREATE TABLE `project.dataset.events_partitioned`
(
  event_id INT64,
  event_timestamp TIMESTAMP,
  data STRING
)
PARTITION BY DATE(event_timestamp)
OPTIONS (require_partition_filter = true);

-- Copy data (partition automatically assigned)
INSERT INTO `project.dataset.events_partitioned`
SELECT * FROM `project.dataset.events_old`;

-- Verify partition distribution
SELECT
  partition_id,
  total_rows
FROM `project.dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'events_partitioned';

-- Swap tables
ALTER TABLE `project.dataset.events_old` RENAME TO events_backup;
ALTER TABLE `project.dataset.events_partitioned` RENAME TO events;
```

## Best Practices Checklist

### Design Phase
- [ ] Analyze query patterns (what columns are filtered?)
- [ ] Estimate data volume per partition (aim for 1-10 GB)
- [ ] Choose appropriate granularity (hour/day/month/year)
- [ ] Plan partition retention policy
- [ ] Consider combining with clustering

### Implementation Phase
- [ ] Create table with PARTITION BY clause
- [ ] Enable require_partition_filter for critical tables
- [ ] Set partition_expiration_days if needed
- [ ] Add clustering for additional pruning
- [ ] Test partition pruning with EXPLAIN

### Maintenance Phase
- [ ] Monitor partition counts (<10,000 per table)
- [ ] Review partition sizes regularly
- [ ] Verify queries use partition filters
- [ ] Check for partition skew
- [ ] Update expiration policies as needed

## Troubleshooting

### Query Not Using Partitions

```sql
-- Check execution details
-- In BigQuery Console → Query Results → Execution Details
-- Look for "Bytes shuffled" and "Bytes processed"

-- Or use EXPLAIN
EXPLAIN SELECT * FROM events WHERE DATE(event_timestamp) = '2024-01-15';
```

### Partition Skew

```sql
-- Find uneven partitions
SELECT
  partition_id,
  total_rows,
  total_logical_bytes / 1024 / 1024 / 1024 as size_gb
FROM `project.dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'events'
ORDER BY size_gb DESC;

-- Solution: Different partitioning strategy or data cleanup
```

## References

- Partitioned Tables: https://cloud.google.com/bigquery/docs/partitioned-tables
- Partition Pruning: https://cloud.google.com/bigquery/docs/querying-partitioned-tables
- Clustered Tables: https://cloud.google.com/bigquery/docs/clustered-tables
