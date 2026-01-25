---
name: redshift-spectrum
description: Amazon Redshift Spectrum for querying S3 data. Use when designing data lake queries or integrating external data with Redshift.
allowed-tools: Read, Bash
user-invocable: true
---

# Redshift Spectrum

## Overview

Redshift Spectrum extends Redshift's query engine to data stored in Amazon S3. Query petabytes of data in S3 without loading it into Redshift, joining external data with local Redshift tables.

## Key Concepts

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Redshift Cluster                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Local Redshift Tables                    │   │
│  │         (Compressed, columnar, local disk)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                    JOIN / UNION                              │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Spectrum Query Engine                     │   │
│  │      (Scales independently for S3 queries)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Amazon S3                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Parquet   │  │     ORC     │  │   CSV/JSON  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Use Cases

- **Data Lake Integration**: Query raw data in S3
- **Historical Data**: Archive old data to S3, query when needed
- **ETL Processing**: Transform S3 data before loading
- **Cost Optimization**: Store infrequently accessed data in S3
- **Data Sharing**: Query shared datasets across accounts

## Creating External Tables

### Basic External Table

```sql
-- Create external schema (connects to Glue Data Catalog)
CREATE EXTERNAL SCHEMA spectrum_schema
FROM DATA CATALOG
DATABASE 'spectrum_db'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftSpectrumRole'
CREATE EXTERNAL DATABASE IF NOT EXISTS;

-- Create external table
CREATE EXTERNAL TABLE spectrum_schema.events (
  event_id BIGINT,
  user_id BIGINT,
  event_type VARCHAR(50),
  event_timestamp TIMESTAMP,
  data VARCHAR(65535)
)
STORED AS PARQUET
LOCATION 's3://my-bucket/events/';
```

### Partitioned External Table

```sql
-- Create partitioned table (most common pattern)
CREATE EXTERNAL TABLE spectrum_schema.logs (
  log_id BIGINT,
  message VARCHAR(65535),
  log_level VARCHAR(10),
  log_timestamp TIMESTAMP
)
PARTITIONED BY (year INT, month INT, day INT)
STORED AS PARQUET
LOCATION 's3://my-bucket/logs/';

-- S3 structure should be:
-- s3://my-bucket/logs/year=2024/month=01/day=15/
-- s3://my-bucket/logs/year=2024/month=01/day=16/

-- Add partitions manually
ALTER TABLE spectrum_schema.logs
ADD PARTITION (year=2024, month=1, day=15)
LOCATION 's3://my-bucket/logs/year=2024/month=01/day=15/';

-- Or use Glue Crawler to auto-discover partitions
```

### Different File Formats

```sql
-- Parquet (recommended)
CREATE EXTERNAL TABLE spectrum_schema.parquet_table (...)
STORED AS PARQUET
LOCATION 's3://bucket/parquet/';

-- ORC
CREATE EXTERNAL TABLE spectrum_schema.orc_table (...)
STORED AS ORC
LOCATION 's3://bucket/orc/';

-- CSV
CREATE EXTERNAL TABLE spectrum_schema.csv_table (...)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 's3://bucket/csv/';

-- JSON
CREATE EXTERNAL TABLE spectrum_schema.json_table (...)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
STORED AS TEXTFILE
LOCATION 's3://bucket/json/';

-- Gzip compressed CSV
CREATE EXTERNAL TABLE spectrum_schema.gzip_table (...)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 's3://bucket/gzip/'
TABLE PROPERTIES ('compression_type'='gzip');
```

## Querying External Tables

### Basic Query

```sql
-- Query external table
SELECT *
FROM spectrum_schema.events
WHERE event_timestamp >= '2024-01-01'
LIMIT 100;
```

### With Partition Filters

```sql
-- Always filter on partition columns for performance
SELECT
  event_type,
  COUNT(*) as event_count
FROM spectrum_schema.logs
WHERE year = 2024
  AND month = 1
  AND day BETWEEN 15 AND 20
GROUP BY event_type;

-- Partition pruning reduces S3 scan
```

### Join External and Local Tables

```sql
-- Join S3 data with Redshift data
SELECT
  e.event_id,
  e.event_type,
  u.user_name,
  u.email
FROM spectrum_schema.events e
JOIN public.users u ON e.user_id = u.user_id
WHERE e.year = 2024
  AND e.month = 1;

-- Redshift optimizes: filter S3, then join with local
```

### Aggregation Push-Down

```sql
-- Aggregations are pushed to Spectrum layer
SELECT
  year,
  month,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM spectrum_schema.events
WHERE year = 2024
GROUP BY year, month, event_type;

-- Spectrum processes aggregation in parallel
-- Only results returned to Redshift
```

## Partition Management

### Manual Partition Management

```sql
-- Add single partition
ALTER TABLE spectrum_schema.logs
ADD PARTITION (year=2024, month=1, day=15)
LOCATION 's3://bucket/logs/year=2024/month=01/day=15/';

-- Add multiple partitions
ALTER TABLE spectrum_schema.logs
ADD IF NOT EXISTS
  PARTITION (year=2024, month=1, day=16) LOCATION 's3://bucket/logs/year=2024/month=01/day=16/'
  PARTITION (year=2024, month=1, day=17) LOCATION 's3://bucket/logs/year=2024/month=01/day=17/'
  PARTITION (year=2024, month=1, day=18) LOCATION 's3://bucket/logs/year=2024/month=01/day=18/';

-- Drop partition
ALTER TABLE spectrum_schema.logs
DROP PARTITION (year=2024, month=1, day=15);
```

### Using Glue Crawler

```bash
# Create Glue Crawler to auto-discover partitions
aws glue create-crawler \
  --name logs-crawler \
  --role arn:aws:iam::123456789012:role/GlueCrawlerRole \
  --database-name spectrum_db \
  --targets '{"S3Targets": [{"Path": "s3://bucket/logs/"}]}'

# Run crawler
aws glue start-crawler --name logs-crawler
```

### View Partitions

```sql
-- List all partitions
SELECT *
FROM svv_external_partitions
WHERE tablename = 'logs';

-- Count partitions
SELECT COUNT(*)
FROM svv_external_partitions
WHERE schemaname = 'spectrum_schema'
  AND tablename = 'logs';
```

## Performance Optimization

### Use Columnar Formats

```sql
-- ✅ Best: Parquet or ORC (columnar, compressed)
STORED AS PARQUET

-- ❌ Avoid for large datasets: CSV, JSON
-- - No column pruning
-- - No predicate pushdown
-- - Higher S3 scan costs
```

### Optimize File Sizes

```
Optimal file size: 128 MB - 1 GB

Too small (< 10 MB):
- High S3 LIST overhead
- Underutilized parallelism

Too large (> 5 GB):
- Can't parallelize within file
- Single Spectrum node bottleneck
```

### Partition for Query Patterns

```sql
-- Partition by commonly filtered columns
PARTITIONED BY (year INT, month INT, day INT)

-- Query with partition filter
SELECT * FROM logs
WHERE year = 2024 AND month = 1 AND day = 15;
-- Only scans s3://bucket/logs/year=2024/month=01/day=15/
```

### Column Pruning

```sql
-- ❌ Bad: SELECT * scans all columns
SELECT * FROM spectrum_schema.events;

-- ✅ Good: Select only needed columns
SELECT event_id, event_type, user_id
FROM spectrum_schema.events;
-- Parquet/ORC only reads selected columns
```

### Predicate Pushdown

```sql
-- Spectrum pushes predicates to S3 scan layer
SELECT *
FROM spectrum_schema.events
WHERE event_type = 'purchase'
  AND user_id > 1000;
-- Filter applied during S3 read (less data transferred)
```

## Cost Optimization

### Spectrum Pricing

```
Cost = Data Scanned from S3 × $5 per TB

Reduce costs by:
1. Using columnar formats (Parquet/ORC)
2. Partitioning data
3. Selecting specific columns
4. Filtering on partitions
```

### Cost Comparison

```sql
-- Full scan of 1 TB table
SELECT * FROM spectrum_schema.events;
-- Cost: ~$5.00

-- With partition filter (scans 10 GB)
SELECT * FROM spectrum_schema.events
WHERE year = 2024 AND month = 1 AND day = 15;
-- Cost: ~$0.05

-- With column selection (3 of 20 columns)
SELECT event_id, event_type, user_id
FROM spectrum_schema.events
WHERE year = 2024 AND month = 1 AND day = 15;
-- Cost: ~$0.0075
```

### Monitor Spectrum Usage

```sql
-- Check Spectrum bytes scanned
SELECT
  query,
  segment,
  s3_scanned_rows,
  s3_scanned_bytes,
  s3query_returned_rows,
  s3query_returned_bytes
FROM svl_s3query_summary
WHERE query = <query_id>;

-- Aggregated Spectrum usage
SELECT
  DATE_TRUNC('day', starttime) as day,
  SUM(s3_scanned_bytes) / 1024 / 1024 / 1024 as gb_scanned,
  COUNT(*) as query_count
FROM svl_s3query_summary
WHERE starttime >= DATEADD(day, -7, GETDATE())
GROUP BY 1
ORDER BY 1;
```

## Common Patterns

### Hot/Cold Data Architecture

```sql
-- Hot data: Recent data in Redshift (fast queries)
CREATE TABLE public.events_hot (
  event_id BIGINT,
  event_timestamp TIMESTAMP,
  event_type VARCHAR(50),
  data VARCHAR(65535)
)
DISTSTYLE EVEN
SORTKEY (event_timestamp);

-- Cold data: Historical data in S3 (cheap storage)
CREATE EXTERNAL TABLE spectrum_schema.events_cold (
  event_id BIGINT,
  event_timestamp TIMESTAMP,
  event_type VARCHAR(50),
  data VARCHAR(65535)
)
PARTITIONED BY (year INT, month INT)
STORED AS PARQUET
LOCATION 's3://bucket/events-archive/';

-- Union view for seamless access
CREATE VIEW public.events_all AS
SELECT * FROM public.events_hot
UNION ALL
SELECT
  event_id,
  event_timestamp,
  event_type,
  data
FROM spectrum_schema.events_cold;

-- Query spans both
SELECT * FROM public.events_all
WHERE event_timestamp >= '2023-01-01';
```

### ETL Staging Pattern

```sql
-- Stage raw data in S3
CREATE EXTERNAL TABLE spectrum_schema.raw_orders (
  order_data VARCHAR(65535)  -- Raw JSON
)
STORED AS TEXTFILE
LOCATION 's3://bucket/raw-orders/';

-- Transform and load to Redshift
INSERT INTO public.orders
SELECT
  JSON_EXTRACT_PATH_TEXT(order_data, 'order_id')::BIGINT,
  JSON_EXTRACT_PATH_TEXT(order_data, 'customer_id')::BIGINT,
  JSON_EXTRACT_PATH_TEXT(order_data, 'amount')::DECIMAL(18,2),
  JSON_EXTRACT_PATH_TEXT(order_data, 'order_date')::DATE
FROM spectrum_schema.raw_orders
WHERE JSON_EXTRACT_PATH_TEXT(order_data, 'order_date')::DATE = CURRENT_DATE - 1;
```

### Data Lake Query Pattern

```sql
-- Query data lake directly without loading
SELECT
  d.region,
  d.product_category,
  SUM(s.amount) as total_sales
FROM spectrum_schema.sales_data_lake s
JOIN public.dim_product d ON s.product_id = d.product_id
WHERE s.year = 2024
  AND s.month = 1
GROUP BY d.region, d.product_category
ORDER BY total_sales DESC;
```

## Troubleshooting

### Check Spectrum Errors

```sql
-- View Spectrum query errors
SELECT
  query,
  file,
  error
FROM svl_s3query
WHERE error IS NOT NULL
ORDER BY starttime DESC
LIMIT 20;
```

### Performance Issues

```sql
-- Identify slow Spectrum queries
SELECT
  query,
  segment,
  elapsed / 1000000.0 as elapsed_seconds,
  s3_scanned_bytes / 1024 / 1024 as mb_scanned
FROM svl_s3query_summary
WHERE elapsed > 60000000  -- > 60 seconds
ORDER BY elapsed DESC
LIMIT 20;
```

### File Format Issues

```sql
-- If queries fail, check file format compatibility
-- Common issues:
-- 1. Schema mismatch (column types)
-- 2. Unsupported compression
-- 3. Corrupted files

-- Test with small sample
SELECT * FROM spectrum_schema.test_table LIMIT 10;
```

## Best Practices Checklist

### Data Storage
- [ ] Use Parquet or ORC format
- [ ] Partition by commonly filtered columns
- [ ] Target file sizes: 128 MB - 1 GB
- [ ] Use Snappy or ZSTD compression

### Schema Design
- [ ] Match Redshift column types
- [ ] Use appropriate partition granularity
- [ ] Document external table schemas

### Query Optimization
- [ ] Always filter on partitions
- [ ] Select only needed columns
- [ ] Push predicates to Spectrum layer
- [ ] Join with local tables when possible

### Cost Management
- [ ] Monitor Spectrum usage
- [ ] Set up billing alerts
- [ ] Archive cold data to S3
- [ ] Review expensive queries

## References

- Redshift Spectrum: https://docs.aws.amazon.com/redshift/latest/dg/c-using-spectrum.html
- External Tables: https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-external-tables.html
- Best Practices: https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-external-performance.html
