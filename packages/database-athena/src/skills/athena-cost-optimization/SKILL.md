---
name: athena-cost-optimization
description: AWS Athena cost optimization techniques and strategies. Use when trying to reduce Athena query costs or analyze spending.
allowed-tools: Read, Bash
user-invocable: true
---

# Athena Cost Optimization

## Overview

AWS Athena charges **$5 per TB of data scanned**. With the right optimizations, you can reduce costs by 90-99% while also improving query performance. This skill covers all cost optimization strategies for Athena.

## Cost Model

### Pricing Basics

```
Cost = Data Scanned (TB) × $5

Examples:
- 1 GB scanned = $0.005
- 10 GB scanned = $0.05
- 100 GB scanned = $0.50
- 1 TB scanned = $5.00
- 10 TB scanned = $50.00
```

**Key Insight**: Reducing data scanned = reducing cost

### What Counts as "Data Scanned"

**Scanned** (you pay for):
- All rows in queried partitions
- All columns in non-columnar formats (CSV, JSON)
- Selected columns in columnar formats (Parquet, ORC)
- Data read even if query is cancelled
- Failed queries

**Not scanned** (free):
- Query result caching (24 hours)
- Schema operations (SHOW, DESCRIBE)
- Failed queries due to syntax errors (before execution)
- Partition metadata operations

## The 95%+ Cost Reduction Formula

```
Optimization Stack:
1. Partitioning: 90% reduction
2. Columnar format: 80% reduction
3. Compression: 70% reduction
4. Column selection: Variable
5. Query optimization: Variable

Combined: 95-99% total reduction!
```

### Example Calculation

```
Original: 1 TB CSV table, SELECT * query
- Data scanned: 1 TB
- Cost: $5.00

After partitioning (daily, query 1 day):
- Data scanned: 2.7 GB (1/365 of data)
- Cost: $0.0135
- Savings: 99.7%

After Parquet + compression:
- Data scanned: 540 MB (80% compression)
- Cost: $0.0027
- Savings: 99.95%

After column selection (5 of 50 columns):
- Data scanned: 54 MB (10% of columns)
- Cost: $0.00027
- Savings: 99.995%

💰 Final: $5.00 → $0.00027 per query
```

## Cost Optimization Checklist

### Priority 1: Partitioning (Highest Impact)

**Impact**: 90-99% cost reduction

```sql
-- ❌ Without partitions: Scans 365 days
SELECT COUNT(*) FROM logs
WHERE timestamp >= TIMESTAMP '2024-01-15';
-- Cost: $5.00 (1 TB scanned)

-- ✅ With partitions: Scans 1 day
SELECT COUNT(*) FROM logs
WHERE date_partition = '2024-01-15'
  AND timestamp >= TIMESTAMP '2024-01-15';
-- Cost: $0.0137 (2.7 GB scanned)
-- Savings: 99.7%
```

**Action Items**:
- [ ] Add partition columns (usually date-based)
- [ ] Ensure queries filter on partition columns
- [ ] Keep partition size 1-10 GB
- [ ] Use Glue Crawler for automatic partition discovery

### Priority 2: Columnar Format (High Impact)

**Impact**: 80-90% cost reduction

```sql
-- ❌ CSV format: Scans all columns
SELECT user_id, action FROM logs_csv;
-- Must scan all 50 columns
-- Cost: $0.50 (100 GB scanned)

-- ✅ Parquet format: Scans only needed columns
SELECT user_id, action FROM logs_parquet;
-- Scans only 2 of 50 columns
-- Cost: $0.02 (4 GB scanned)
-- Savings: 96%
```

**Action Items**:
- [ ] Convert CSV/JSON to Parquet
- [ ] Use Snappy or ZSTD compression
- [ ] Combine with partitioning
- [ ] Target file size: 128 MB - 1 GB

### Priority 3: Column Selection (Medium Impact)

**Impact**: Variable (depends on column count)

```sql
-- ❌ SELECT *: Scans all columns
SELECT * FROM logs
WHERE date_partition = '2024-01-15';
-- Scans 50 columns
-- Cost: $0.0137

-- ✅ SELECT specific: Scans only needed columns
SELECT user_id, action, timestamp
FROM logs
WHERE date_partition = '2024-01-15';
-- Scans 3 columns
-- Cost: $0.0008
-- Savings: 94%
```

**Action Items**:
- [ ] Never use SELECT * in production
- [ ] List only required columns
- [ ] Remove unused columns from SELECT
- [ ] Audit queries for unnecessary columns

### Priority 4: Query Optimization (Variable Impact)

**Impact**: 50-90% cost reduction per query

See detailed sections below.

## Partitioning Strategies

### Strategy 1: Always Filter on Partitions

```sql
-- ❌ Bad: No partition filter
SELECT COUNT(*) FROM events
WHERE user_id = '123';
-- Scans ALL partitions

-- ✅ Good: Include partition filter
SELECT COUNT(*) FROM events
WHERE date_partition >= '2024-01-01'
  AND user_id = '123';
-- Scans only 2024 partitions
```

### Strategy 2: Use Specific Partition Values

```sql
-- ❌ Avoid: Function on partition column
SELECT * FROM logs
WHERE YEAR(date_partition) = 2024;
-- Can't use partition pruning!

-- ✅ Good: Direct partition filter
SELECT * FROM logs
WHERE date_partition >= '2024-01-01'
  AND date_partition < '2025-01-01';
-- Uses partition pruning
```

### Strategy 3: Partition Granularity

```sql
-- Low volume (< 1 GB/day): Weekly partitions
PARTITIONED BY (week_partition STRING)  -- '2024-W03'

-- Medium volume (1-50 GB/day): Daily partitions
PARTITIONED BY (date_partition STRING)  -- '2024-01-15'

-- High volume (> 50 GB/day): Hourly partitions
PARTITIONED BY (date_partition STRING, hour INT)
```

## Column Selection Optimization

### Analyze Column Usage

```sql
-- Find most-used columns in your queries
-- Review query history and identify common patterns

-- Example query pattern analysis:
-- 80% of queries use: user_id, timestamp, action
-- 15% of queries use: user_id, timestamp, action, ip_address
-- 5% of queries use: all columns

-- Optimization: Create summary table with common columns
CREATE TABLE events_summary
WITH (
  format = 'PARQUET',
  partitioned_by = ARRAY['date_partition']
) AS
SELECT
  user_id,
  timestamp,
  action,
  ip_address,
  date_partition
FROM events_full;

-- Use summary table for 95% of queries
-- Use full table only when needed
```

### Avoid SELECT * in Production

```sql
-- ❌ Bad: Loads all columns
INSERT INTO target
SELECT * FROM source
WHERE date_partition = '2024-01-15';

-- ✅ Good: Explicit columns
INSERT INTO target
SELECT
  user_id,
  action,
  timestamp,
  date_partition
FROM source
WHERE date_partition = '2024-01-15';

-- Benefit: Clear schema, column pruning, maintainable
```

## Query Pattern Optimization

### Use LIMIT for Exploration

```sql
-- ❌ Bad: Scans entire table
SELECT * FROM logs
WHERE date_partition = '2024-01-15';
-- Scans all 10 GB

-- ✅ Good: LIMIT for quick checks
SELECT * FROM logs
WHERE date_partition = '2024-01-15'
LIMIT 100;
-- Still scans all 10 GB! (LIMIT applied after scan)

-- ✅ Better: Sample partition
SELECT * FROM logs
WHERE date_partition = '2024-01-15'
  AND user_id LIKE '1%'
LIMIT 100;
-- Scans less data if early termination possible
```

### Avoid Full Table Scans

```sql
-- ❌ Bad: Count all rows
SELECT COUNT(*) FROM logs;
-- Scans entire table

-- ✅ Good: Count with partition filter
SELECT COUNT(*) FROM logs
WHERE date_partition >= '2024-01-01';
-- Scans only 2024 data

-- ✅ Better: Use approximate
SELECT APPROX_DISTINCT(user_id) FROM logs
WHERE date_partition >= '2024-01-01';
-- Faster, cheaper, ~2% error
```

### Optimize JOINs

```sql
-- ❌ Bad: JOIN before filtering
SELECT *
FROM large_table l
JOIN small_table s ON l.id = s.id;
-- Scans all of large_table

-- ✅ Good: Filter before JOIN
SELECT *
FROM (
  SELECT * FROM large_table
  WHERE date_partition = '2024-01-15'
) l
JOIN small_table s ON l.id = s.id;
-- Only scans 1 partition

-- ✅ Better: Use CTE
WITH filtered AS (
  SELECT * FROM large_table
  WHERE date_partition = '2024-01-15'
)
SELECT *
FROM filtered l
JOIN small_table s ON l.id = s.id;
```

### Use Subqueries for Repeated Logic

```sql
-- ❌ Bad: Repeat expensive calculation
SELECT
  user_id,
  (SELECT COUNT(*) FROM events WHERE events.user_id = users.user_id) as event_count,
  (SELECT MAX(timestamp) FROM events WHERE events.user_id = users.user_id) as last_event
FROM users;
-- Scans events table twice per user!

-- ✅ Good: Single scan with aggregation
SELECT
  u.user_id,
  COUNT(e.event_id) as event_count,
  MAX(e.timestamp) as last_event
FROM users u
LEFT JOIN events e ON u.user_id = e.user_id
WHERE e.date_partition >= '2024-01-01'
GROUP BY u.user_id;
-- Single scan of events
```

## Using CTAS for Repeated Queries

### Pattern: Pre-Aggregate Common Queries

```sql
-- Expensive query run 100 times/day:
SELECT
  date_partition,
  user_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as session_count,
  SUM(duration_ms) as total_duration
FROM events
WHERE date_partition >= '2024-01-01'
GROUP BY date_partition, user_id;

-- Cost: 100 GB × 100 queries × $5/TB = $50/day

-- Solution: Create summary table (once per day)
CREATE TABLE daily_user_summary
WITH (
  format = 'PARQUET',
  partitioned_by = ARRAY['date_partition']
) AS
SELECT
  date_partition,
  user_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as session_count,
  SUM(duration_ms) as total_duration
FROM events
WHERE date_partition >= '2024-01-01'
GROUP BY date_partition, user_id;

-- Query summary table
SELECT * FROM daily_user_summary
WHERE date_partition = '2024-01-15';

-- Cost: 100 GB × 1 query (CTAS) + 1 GB × 100 queries
--     = $0.50 + $0.50 = $1/day
-- Savings: $49/day (98% reduction!)
```

### Pattern: Materialized Views

```sql
-- Create "view" with pre-computed results
CREATE TABLE active_users_last_7_days
WITH (
  format = 'PARQUET'
) AS
SELECT
  user_id,
  MAX(timestamp) as last_active,
  COUNT(*) as event_count
FROM events
WHERE date_partition >= DATE_FORMAT(CURRENT_DATE - INTERVAL '7' DAY, '%Y-%m-%d')
GROUP BY user_id
HAVING COUNT(*) >= 5;

-- Refresh daily via scheduled query
-- Query the materialized table (cheap!)
SELECT * FROM active_users_last_7_days;
```

## Approximate Functions

### APPROX_DISTINCT vs COUNT(DISTINCT)

```sql
-- ❌ Expensive: Exact count
SELECT COUNT(DISTINCT user_id) FROM logs
WHERE date_partition = '2024-01-15';
-- Scans: 10 GB
-- Time: 30s
-- Cost: $0.05

-- ✅ Cheaper: Approximate count (~2% error)
SELECT APPROX_DISTINCT(user_id) FROM logs
WHERE date_partition = '2024-01-15';
-- Scans: 10 GB (same)
-- Time: 5s (6x faster!)
-- Cost: $0.05 (same)

-- BUT: Faster = less slot time = more queries per hour
```

### APPROX_PERCENTILE

```sql
-- ❌ Expensive: Exact percentile
SELECT
  PERCENTILE(response_time_ms, 0.95) as p95
FROM logs
WHERE date_partition = '2024-01-15';
-- Slow, memory intensive

-- ✅ Faster: Approximate percentile
SELECT
  APPROX_PERCENTILE(response_time_ms, 0.95) as p95
FROM logs
WHERE date_partition = '2024-01-15';
-- 10x faster, ~1% error
```

## Query Result Caching

### How Caching Works

```sql
-- First run: Scans data, caches result (24 hours)
SELECT COUNT(*) FROM logs
WHERE date_partition = '2024-01-15';
-- Scans: 10 GB
-- Cost: $0.05
-- Time: 10s

-- Second run (within 24 hours): Uses cache
SELECT COUNT(*) FROM logs
WHERE date_partition = '2024-01-15';
-- Scans: 0 GB
-- Cost: $0.00 (FREE!)
-- Time: < 1s
```

### Cache Invalidation

Cache invalidated by:
1. Source data changes
2. Query text changes (even whitespace!)
3. 24 hours elapsed

**Tip**: Use views for consistent query text

```sql
-- Create view for common query
CREATE VIEW daily_stats AS
SELECT
  date_partition,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as unique_users
FROM logs
GROUP BY date_partition;

-- Query view (consistent text = better caching)
SELECT * FROM daily_stats
WHERE date_partition = '2024-01-15';
```

## Workgroup Configuration

### Set Query Limits

```bash
# Via AWS CLI
aws athena update-work-group \
  --work-group primary \
  --configuration-updates \
    "ResultConfigurationUpdates={OutputLocation=s3://bucket/results/},\
     EnforceWorkGroupConfiguration=true,\
     PublishCloudWatchMetricsEnabled=true,\
     BytesScannedCutoffPerQuery=107374182400"  # 100 GB limit

# Prevents runaway queries from scanning > 100 GB
```

**Recommended Limits**:
- Development: 10-50 GB per query
- Production analytics: 100-500 GB per query
- Data science: 1-5 TB per query (with approval)

### Per-Workgroup Budgets

```sql
-- Create separate workgroups for different teams
Workgroups:
- data-science: 10 TB/day limit
- analytics: 1 TB/day limit
- development: 100 GB/day limit

-- Track spending per team
-- Alert when approaching limits
```

### Query Timeout

```bash
# Prevent long-running queries
aws athena update-work-group \
  --work-group primary \
  --configuration-updates \
    "EngineVersion={SelectedEngineVersion=Athena engine version 3},\
     AdditionalConfiguration={ExecutionTimeout=1800}"  # 30 minutes
```

## Cost Monitoring

### CloudWatch Metrics

```sql
-- Key metrics to monitor:
- DataScannedInBytes: Total data scanned
- QueryExecutionTime: Query duration
- EngineExecutionTime: Time spent processing

-- Set alarms:
aws cloudwatch put-metric-alarm \
  --alarm-name athena-high-scan \
  --metric-name DataScannedInBytes \
  --namespace AWS/Athena \
  --statistic Sum \
  --period 3600 \
  --threshold 1099511627776 \  # 1 TB/hour
  --comparison-operator GreaterThanThreshold
```

### Query History Analysis

```sql
-- Find expensive queries (pseudo-SQL, requires AWS API)
SELECT
  query,
  data_scanned_in_bytes / 1024 / 1024 / 1024 as gb_scanned,
  (data_scanned_in_bytes / 1024 / 1024 / 1024 / 1024) * 5 as estimated_cost_usd,
  execution_time_ms / 1000 as execution_seconds
FROM athena_query_history
WHERE submission_date_time >= CURRENT_DATE - INTERVAL '7' DAY
ORDER BY data_scanned_in_bytes DESC
LIMIT 100;

-- Identify optimization opportunities:
-- 1. Queries without partition filters
-- 2. SELECT * queries
-- 3. Queries scanning > 100 GB
-- 4. Frequent repeated queries (candidates for CTAS)
```

### Cost Allocation Tags

```bash
# Tag Athena queries for cost tracking
aws athena start-query-execution \
  --query-string "SELECT * FROM logs" \
  --result-configuration "OutputLocation=s3://bucket/results/" \
  --query-execution-context "Database=mydb" \
  --tags "team=analytics,project=dashboard,env=prod"

# Track costs by tag in Cost Explorer
```

## Advanced Optimization Techniques

### Use Views for Access Patterns

```sql
-- Create role-specific views with partition filters
CREATE VIEW logs_last_30_days AS
SELECT * FROM logs
WHERE date_partition >= DATE_FORMAT(CURRENT_DATE - INTERVAL '30' DAY, '%Y-%m-%d');

-- Analysts query view (can't accidentally query old data)
SELECT * FROM logs_last_30_days
WHERE user_id = '123';
-- Automatically limited to 30 days
```

### Partition Projection

```sql
-- Eliminate MSCK REPAIR TABLE and partition metadata
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  action STRING
)
PARTITIONED BY (dt STRING)
STORED AS PARQUET
LOCATION 's3://bucket/logs/'
TBLPROPERTIES (
  "projection.enabled" = "true",
  "projection.dt.type" = "date",
  "projection.dt.range" = "2024-01-01,NOW",
  "projection.dt.format" = "yyyy-MM-dd",
  "storage.location.template" = "s3://bucket/logs/dt=${dt}"
);

-- Athena automatically "projects" partitions
-- No need to run ALTER TABLE ADD PARTITION
-- Faster query planning
```

### Incremental Processing

```sql
-- Process only new partitions
-- Track last processed partition
CREATE TABLE last_processed (
  table_name STRING,
  last_partition STRING
);

-- Insert only new data
INSERT INTO processed_events
SELECT * FROM raw_events
WHERE date_partition > (
  SELECT last_partition FROM last_processed
  WHERE table_name = 'raw_events'
);

-- Update tracking
UPDATE last_processed
SET last_partition = '2024-01-15'
WHERE table_name = 'raw_events';
```

### Data Lifecycle Management

```sql
-- Archive old data to reduce query scope
-- Keep last 90 days in hot table
CREATE TABLE logs_hot AS
SELECT * FROM logs
WHERE date_partition >= DATE_FORMAT(CURRENT_DATE - INTERVAL '90' DAY, '%Y-%m-%d');

-- Archive older data
CREATE TABLE logs_archive AS
SELECT * FROM logs
WHERE date_partition < DATE_FORMAT(CURRENT_DATE - INTERVAL '90' DAY, '%Y-%m-%d');

-- Union view for historical queries
CREATE VIEW logs_all AS
SELECT * FROM logs_hot
UNION ALL
SELECT * FROM logs_archive;

-- Most queries only scan hot table (cheaper)
```

## Cost Optimization Checklist

### Before Running Queries

- [ ] Add partition filters to WHERE clause
- [ ] Select only needed columns (no SELECT *)
- [ ] Use approximate functions if exact not required
- [ ] Check if result is cached (run identical query)
- [ ] Estimate data scanned with EXPLAIN

### Table Design

- [ ] Partitioned by date (daily or hourly)
- [ ] Using Parquet with Snappy/ZSTD compression
- [ ] File sizes between 128 MB - 1 GB
- [ ] No more than 3 partition columns
- [ ] Partition size 1-10 GB

### Query Patterns

- [ ] Filter on partitions in every query
- [ ] Use CTAS for repeated aggregations
- [ ] Avoid full table scans
- [ ] Filter before joining
- [ ] Use CTEs for complex queries

### Monitoring

- [ ] Set up CloudWatch alarms for high usage
- [ ] Review query history weekly
- [ ] Track costs by team/project with tags
- [ ] Set workgroup data limits
- [ ] Monitor partition growth

## Real-World Example

```
Company: E-commerce platform
Data: 100 TB of event logs
Queries: 500/day

Before Optimization:
- Format: CSV
- Partitioning: None
- Queries: SELECT * common
- Average query: 200 GB scanned
- Cost: 500 queries × 200 GB × $5/TB = $500/day = $15,000/month

After Optimization:
1. Added daily partitions
2. Converted to Parquet + Snappy
3. Changed queries to select specific columns
4. Added partition filters
5. Created summary tables for common queries

After Optimization:
- Format: Parquet (Snappy)
- Partitioning: Daily
- Queries: Explicit columns + partition filters
- Average query: 2 GB scanned
- Cost: 500 queries × 2 GB × $5/TB = $5/day = $150/month

💰 Savings: $14,850/month (99% reduction!)
ROI: Optimization effort paid back in 1 week
```

## Quick Reference

| Optimization | Impact | Difficulty |
|--------------|--------|------------|
| Add partitions | 90-99% | Easy |
| Convert to Parquet | 80-90% | Easy |
| Select specific columns | 50-90% | Easy |
| Add compression | 70-80% | Easy |
| Use CTAS for repeated queries | 90%+ | Medium |
| Optimize JOIN order | 50-80% | Medium |
| Use approximate functions | 10-50% (speed) | Easy |
| Partition projection | 20-40% (speed) | Medium |

**Recommended First Steps**:
1. Add daily partitions (highest impact)
2. Convert to Parquet with Snappy (easy wins)
3. Audit queries for SELECT * (quick fixes)
4. Set workgroup data limits (prevent accidents)

## References

- Athena Pricing: https://aws.amazon.com/athena/pricing/
- Performance Tuning: https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html
- Cost Optimization Best Practices: https://aws.amazon.com/blogs/big-data/top-10-performance-tuning-tips-for-amazon-athena/
- CloudWatch Metrics: https://docs.aws.amazon.com/athena/latest/ug/query-metrics-viewing.html
