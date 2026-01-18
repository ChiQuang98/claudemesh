---
name: athena-partitioning
description: AWS Athena partition design and optimization strategies. Use when designing partition schemes or optimizing partition performance.
allowed-tools: Read, Bash
user-invocable: true
---

# Athena Partitioning Strategies

## Overview

Partitioning is the most critical optimization technique in AWS Athena. Proper partition design can reduce query costs by 90%+ and improve performance dramatically. This skill covers partition design patterns, best practices, and common pitfalls.

## Key Concepts

### What is Partitioning?

Partitioning divides your data into separate files/directories based on column values. Athena can skip entire partitions when querying, reducing data scanned.

**Cost Impact**:
- Without partitions: Scans entire dataset ($5 per TB)
- With partitions: Scans only relevant partitions (often 10-100x less)

### Partition Structure in S3

```
s3://bucket/logs/
├── year=2024/
│   ├── month=01/
│   │   ├── day=01/
│   │   │   ├── file1.parquet
│   │   │   └── file2.parquet
│   │   ├── day=02/
│   │   │   └── file1.parquet
│   │   └── day=03/
│   │       └── file1.parquet
│   └── month=02/
│       ├── day=01/
│       └── day=02/
└── year=2023/
    └── ...
```

## Date-Based Partitioning

### Daily Partitions (Most Common)

```sql
-- Table definition
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  user_id STRING,
  timestamp TIMESTAMP,
  action STRING,
  response_time_ms INT
)
PARTITIONED BY (
  year INT,
  month INT,
  day INT
)
STORED AS PARQUET
LOCATION 's3://bucket/logs/';

-- Add partitions
ALTER TABLE logs ADD IF NOT EXISTS
  PARTITION (year=2024, month=1, day=15)
  LOCATION 's3://bucket/logs/year=2024/month=01/day=15/'
  PARTITION (year=2024, month=1, day=16)
  LOCATION 's3://bucket/logs/year=2024/month=01/day=16/';

-- Query specific day (only scans 1 day)
SELECT COUNT(*) FROM logs
WHERE year = 2024 AND month = 1 AND day = 15;

-- Query date range
SELECT COUNT(*) FROM logs
WHERE year = 2024 AND month = 1
  AND day BETWEEN 15 AND 20;
```

**When to Use**:
- Log data with daily volumes of 1-100 GB
- Most queries filter by specific dates
- Data retention policies by day
- Daily ETL processes

### Hourly Partitions

```sql
CREATE EXTERNAL TABLE events (
  event_id STRING,
  event_type STRING,
  data JSONB
)
PARTITIONED BY (
  year INT,
  month INT,
  day INT,
  hour INT
)
STORED AS PARQUET
LOCATION 's3://bucket/events/';

-- Query specific hour
SELECT * FROM events
WHERE year = 2024 AND month = 1 AND day = 15 AND hour = 10;
```

**When to Use**:
- High-volume streaming data (100+ GB/day)
- Real-time analytics requirements
- Each hour generates 1-10 GB of data

**Warning**: Don't over-partition! Too many small files hurts performance.

### Alternative: Date String Partition

```sql
-- Simpler partition structure
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  user_id STRING,
  action STRING
)
PARTITIONED BY (
  date_partition STRING  -- Format: 'YYYY-MM-DD'
)
STORED AS PARQUET
LOCATION 's3://bucket/logs/';

-- S3 structure:
-- s3://bucket/logs/date_partition=2024-01-15/
-- s3://bucket/logs/date_partition=2024-01-16/

-- Add partition
ALTER TABLE logs ADD PARTITION (date_partition='2024-01-15')
LOCATION 's3://bucket/logs/date_partition=2024-01-15/';

-- Query
SELECT * FROM logs
WHERE date_partition = '2024-01-15';

-- Date range
SELECT * FROM logs
WHERE date_partition >= '2024-01-01'
  AND date_partition <= '2024-01-31';
```

**Advantages**:
- Simpler structure (1 partition column vs 3)
- Easier to manage
- Cleaner queries

**Disadvantages**:
- String comparisons slightly slower than INT
- Can't query "all January data" efficiently without listing all days

## Multi-Dimensional Partitioning

### Partition by Date + Category

```sql
CREATE EXTERNAL TABLE sales (
  order_id STRING,
  product_id STRING,
  amount DECIMAL(10, 2),
  timestamp TIMESTAMP
)
PARTITIONED BY (
  date_partition STRING,  -- YYYY-MM-DD
  region STRING
)
STORED AS PARQUET
LOCATION 's3://bucket/sales/';

-- S3 structure:
-- s3://bucket/sales/date_partition=2024-01-15/region=us-east/
-- s3://bucket/sales/date_partition=2024-01-15/region=us-west/
-- s3://bucket/sales/date_partition=2024-01-15/region=eu-west/

-- Query specific region and date
SELECT SUM(amount) FROM sales
WHERE date_partition = '2024-01-15'
  AND region = 'us-east';
```

**When to Use**:
- Queries often filter by both dimensions
- Data naturally segments by category (region, tenant, product line)
- Each combination has reasonable data volume (1-10 GB)

### Three-Dimensional Partitioning

```sql
CREATE EXTERNAL TABLE metrics (
  metric_name STRING,
  value DOUBLE,
  tags MAP<STRING, STRING>
)
PARTITIONED BY (
  date_partition STRING,
  environment STRING,  -- prod, staging, dev
  service STRING       -- api, worker, frontend
)
STORED AS PARQUET
LOCATION 's3://bucket/metrics/';

-- Query specific service in production
SELECT metric_name, AVG(value)
FROM metrics
WHERE date_partition >= '2024-01-01'
  AND environment = 'prod'
  AND service = 'api'
GROUP BY metric_name;
```

**Considerations**:
- More partitions = more complexity
- Ensure queries actually use all partition columns
- Monitor partition count (millions of partitions = metadata overhead)

## Partition Granularity Guidelines

### Optimal Partition Size: 1-10 GB

**Too Small (< 100 MB)**:
```
❌ Bad: Millions of tiny partitions
s3://logs/year=2024/month=01/day=15/hour=10/minute=00/
s3://logs/year=2024/month=01/day=15/hour=10/minute=01/
...
```

**Problems**:
- High metadata overhead
- Slow query planning
- Many small files (inefficient)
- S3 LIST operations expensive

**Too Large (> 50 GB)**:
```
❌ Bad: Only yearly partitions
s3://logs/year=2024/
```

**Problems**:
- Scans too much data
- Minimal cost savings
- Poor query performance

**Just Right**:
```
✅ Good: Daily partitions with 5 GB/day
s3://logs/date_partition=2024-01-15/
```

### Partition Size Calculator

```python
# Example calculation
daily_data_volume_gb = 50  # Your daily data volume
days_per_partition = 1      # Adjust based on volume

if daily_data_volume_gb < 1:
    # Low volume: weekly partitions
    partition_scheme = "weekly"
    partition_size_gb = daily_data_volume_gb * 7
elif daily_data_volume_gb > 50:
    # High volume: hourly partitions
    partition_scheme = "hourly"
    partition_size_gb = daily_data_volume_gb / 24
else:
    # Medium volume: daily partitions
    partition_scheme = "daily"
    partition_size_gb = daily_data_volume_gb

print(f"Recommended: {partition_scheme} partitions")
print(f"Estimated partition size: {partition_size_gb:.2f} GB")
```

## Partition Management

### Adding Partitions

#### Method 1: ALTER TABLE (Manual)

```sql
-- Add single partition
ALTER TABLE logs ADD PARTITION (date_partition='2024-01-15')
LOCATION 's3://bucket/logs/date_partition=2024-01-15/';

-- Add multiple partitions
ALTER TABLE logs ADD IF NOT EXISTS
  PARTITION (date_partition='2024-01-15')
  LOCATION 's3://bucket/logs/date_partition=2024-01-15/'
  PARTITION (date_partition='2024-01-16')
  LOCATION 's3://bucket/logs/date_partition=2024-01-16/'
  PARTITION (date_partition='2024-01-17')
  LOCATION 's3://bucket/logs/date_partition=2024-01-17/';
```

#### Method 2: MSCK REPAIR TABLE (Auto-Discovery)

```sql
-- Discovers all partitions in S3 automatically
MSCK REPAIR TABLE logs;

-- Works when S3 structure matches partition scheme:
-- s3://bucket/logs/date_partition=2024-01-15/
-- s3://bucket/logs/date_partition=2024-01-16/
```

**Limitations**:
- Only works with Hive-style partitioning (`key=value/`)
- Slow for tables with many partitions
- Can timeout on very large tables

#### Method 3: AWS Glue Crawler

```bash
# Run Glue Crawler via AWS CLI
aws glue start-crawler --name logs-crawler

# Crawler automatically:
# 1. Scans S3 bucket
# 2. Infers schema
# 3. Creates/updates partitions
# 4. Updates Glue Data Catalog
```

**Recommended for**:
- Production environments
- Automated daily updates
- Large tables with many partitions

### Dropping Old Partitions

```sql
-- Drop single partition
ALTER TABLE logs DROP PARTITION (date_partition='2024-01-01');

-- Drop multiple partitions
ALTER TABLE logs DROP IF EXISTS
  PARTITION (date_partition='2024-01-01')
  PARTITION (date_partition='2024-01-02')
  PARTITION (date_partition='2024-01-03');

-- Verify partitions
SHOW PARTITIONS logs;
```

**Note**: Dropping partition from Athena only removes metadata. S3 data remains until you delete it.

### Viewing Partitions

```sql
-- List all partitions
SHOW PARTITIONS logs;

-- Output:
-- date_partition=2024-01-15
-- date_partition=2024-01-16
-- date_partition=2024-01-17

-- Count partitions
SELECT COUNT(*) FROM information_schema.partitions
WHERE table_name = 'logs';
```

## Query Patterns for Partitions

### ✅ Good Queries (Use Partitions)

```sql
-- Equality filter
SELECT * FROM logs
WHERE date_partition = '2024-01-15';

-- Range filter
SELECT * FROM logs
WHERE date_partition >= '2024-01-01'
  AND date_partition <= '2024-01-31';

-- IN clause
SELECT * FROM logs
WHERE date_partition IN ('2024-01-15', '2024-01-16', '2024-01-17');

-- BETWEEN
SELECT * FROM logs
WHERE date_partition BETWEEN '2024-01-01' AND '2024-01-31';
```

### ❌ Bad Queries (Skip Partitions)

```sql
-- No partition filter (scans ALL data)
SELECT * FROM logs
WHERE user_id = '123';

-- Filter on non-partition column only
SELECT * FROM logs
WHERE timestamp > TIMESTAMP '2024-01-15';

-- Function on partition column (can't use partition pruning)
SELECT * FROM logs
WHERE DATE(date_partition) = DATE '2024-01-15';

-- Partition filter in OR condition
SELECT * FROM logs
WHERE date_partition = '2024-01-15' OR user_id = '123';
```

### Converting Timestamp to Partition Filter

```sql
-- ❌ Bad: Scans all partitions
SELECT * FROM logs
WHERE timestamp >= TIMESTAMP '2024-01-15 00:00:00'
  AND timestamp < TIMESTAMP '2024-01-16 00:00:00';

-- ✅ Good: Uses partition pruning
SELECT * FROM logs
WHERE date_partition = '2024-01-15'
  AND timestamp >= TIMESTAMP '2024-01-15 00:00:00'
  AND timestamp < TIMESTAMP '2024-01-16 00:00:00';
```

## Advanced Patterns

### Partitioning for Data Lake

```sql
-- Raw data (frequently accessed)
CREATE EXTERNAL TABLE logs_raw (
  request_id STRING,
  data STRING
)
PARTITIONED BY (date_partition STRING)
STORED AS PARQUET
LOCATION 's3://bucket/logs/raw/';

-- Processed data (less frequent access)
CREATE EXTERNAL TABLE logs_processed (
  request_id STRING,
  user_id STRING,
  parsed_data STRUCT<...>
)
PARTITIONED BY (
  year INT,
  month INT
)
STORED AS PARQUET
LOCATION 's3://bucket/logs/processed/';
```

**Pattern**:
- Raw: Daily partitions (hot data, frequent queries)
- Processed: Monthly partitions (cold data, analytics)

### Time-Based Data Retention

```sql
-- Keep only last 90 days
-- Automated script to drop old partitions
WITH old_partitions AS (
  SELECT partition_name
  FROM information_schema.partitions
  WHERE table_name = 'logs'
    AND partition_name < DATE_FORMAT(CURRENT_DATE - INTERVAL '90' DAY, '%Y-%m-%d')
)
SELECT partition_name FROM old_partitions;

-- Then drop via script:
-- ALTER TABLE logs DROP PARTITION (date_partition='...');
```

### Partition Evolution

```sql
-- Start with daily partitions
CREATE EXTERNAL TABLE events_daily (...)
PARTITIONED BY (date_partition STRING);

-- As data grows, migrate to hourly
CREATE EXTERNAL TABLE events_hourly (...)
PARTITIONED BY (date_partition STRING, hour INT);

-- Union view for queries
CREATE VIEW events AS
SELECT * FROM events_daily
WHERE date_partition < '2024-01-01'
UNION ALL
SELECT * FROM events_hourly
WHERE date_partition >= '2024-01-01';
```

## Common Mistakes

### ❌ Mistake 1: Too Many Partition Columns

```sql
-- Bad: 5 partition columns
PARTITIONED BY (year, month, day, hour, minute)

-- Problem: Millions of tiny partitions
-- Solution: Reduce to 2-3 columns
PARTITIONED BY (date_partition, hour)
```

### ❌ Mistake 2: Partition Column Not in WHERE

```sql
-- Table has date_partition column
PARTITIONED BY (date_partition STRING)

-- Query forgets to filter on it
SELECT * FROM logs
WHERE user_id = '123';  -- Scans ALL partitions!

-- Fix: Always include partition filter
SELECT * FROM logs
WHERE date_partition >= '2024-01-01'
  AND user_id = '123';
```

### ❌ Mistake 3: Non-Hive Partitioning

```sql
-- S3 structure without key=value format:
-- s3://bucket/logs/2024/01/15/

-- MSCK REPAIR TABLE won't work
-- Must use ALTER TABLE ADD PARTITION manually
```

### ❌ Mistake 4: Duplicate Data Across Partitions

```sql
-- Data for 2024-01-15 exists in multiple partitions
-- s3://bucket/logs/date_partition=2024-01-15/
-- s3://bucket/logs/date_partition=2024-01-16/  (also has 01-15 data!)

-- Results in duplicate rows in queries
-- Solution: Ensure partition boundaries are strict
```

## Best Practices Checklist

**Design Phase**:
- [ ] Analyze query patterns (what columns are filtered?)
- [ ] Estimate data volume per partition (aim for 1-10 GB)
- [ ] Choose 1-3 partition columns (usually date-based)
- [ ] Use Hive-style partitioning (`key=value/`) for MSCK REPAIR
- [ ] Plan partition retention policy

**Implementation Phase**:
- [ ] Create table with PARTITIONED BY clause
- [ ] Set up automated partition creation (Glue Crawler or script)
- [ ] Test partition pruning with EXPLAIN
- [ ] Document partition scheme for team

**Maintenance Phase**:
- [ ] Monitor partition count (avoid millions of partitions)
- [ ] Drop old partitions per retention policy
- [ ] Check for missing partitions regularly
- [ ] Verify queries actually use partition filters
- [ ] Review data scanned metrics in Athena console

## Testing Partition Efficiency

```sql
-- Check if query uses partitions
EXPLAIN SELECT * FROM logs
WHERE date_partition = '2024-01-15';

-- Look for:
-- "partitions=1" (good - only 1 partition)
-- vs
-- "partitions=365" (bad - scanning entire year)

-- Check data scanned
-- Run query and check Athena console:
-- - Data scanned: Should be ~partition size
-- - Run time: Should be fast
```

## When NOT to Partition

**Skip partitioning if**:
- Total dataset < 1 GB
- No common filter columns
- Data changes frequently (UPDATES/DELETES)
- Queries always scan full table
- Data structure changes often

**In these cases**: Use single location without partitions, optimize with Parquet and compression instead.

## References

- AWS Athena Partitioning: https://docs.aws.amazon.com/athena/latest/ug/partitions.html
- Glue Crawlers: https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html
- Top 10 Athena Performance Tips: https://aws.amazon.com/blogs/big-data/top-10-performance-tuning-tips-for-amazon-athena/
