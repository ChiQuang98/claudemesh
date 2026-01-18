---
name: athena-file-formats
description: AWS Athena file format selection and optimization. Use when choosing between Parquet, ORC, Avro, or converting file formats.
allowed-tools: Read, Bash
user-invocable: true
---

# Athena File Formats

## Overview

File format selection is the second most important optimization in Athena after partitioning. Choosing the right format can reduce costs by 80-90% and improve query performance by 10-100x.

## Format Comparison Matrix

| Format | Type | Compression | Read Speed | Write Speed | Best For |
|--------|------|-------------|------------|-------------|----------|
| **Parquet** | Columnar | Excellent | Very Fast | Medium | Analytics, Athena (recommended) |
| **ORC** | Columnar | Excellent | Very Fast | Medium | Hive, Presto, analytics |
| **Avro** | Row-based | Good | Medium | Fast | Streaming, schema evolution |
| **JSON** | Row-based | Poor | Slow | Fast | APIs, human-readable |
| **CSV** | Row-based | Poor | Slow | Fast | Simple data, human-readable |

## Parquet (Recommended)

### Why Parquet for Athena?

**Advantages**:
- **Columnar storage**: Only read columns you need
- **Excellent compression**: 80-90% size reduction vs CSV
- **Predicate pushdown**: Skip row groups based on statistics
- **Native Athena support**: Optimized for Presto engine
- **Wide ecosystem**: Spark, Pandas, Arrow all support it

**Typical Savings**:
- Storage: 80-90% reduction
- Query cost: 80-90% reduction
- Query time: 10-100x faster

### Creating Parquet Tables

#### Method 1: CTAS (Create Table As Select)

```sql
-- Convert existing CSV table to Parquet
CREATE TABLE logs_parquet
WITH (
  format = 'PARQUET',
  parquet_compression = 'SNAPPY',
  external_location = 's3://bucket/logs-parquet/'
) AS
SELECT * FROM logs_csv;
```

#### Method 2: CREATE TABLE (Empty)

```sql
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  user_id STRING,
  timestamp TIMESTAMP,
  action STRING,
  metadata MAP<STRING, STRING>
)
STORED AS PARQUET
LOCATION 's3://bucket/logs/';
```

#### Method 3: SerDe (Explicit)

```sql
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  user_id STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
LOCATION 's3://bucket/logs/';
```

### Parquet Compression Options

#### SNAPPY (Default - Recommended)

```sql
CREATE TABLE logs_snappy
WITH (
  format = 'PARQUET',
  parquet_compression = 'SNAPPY'
) AS SELECT * FROM source;
```

**Characteristics**:
- Compression ratio: ~2-4x
- Decompression speed: **Very fast** (250-500 MB/s)
- CPU usage: Low
- Use case: General purpose (recommended default)

#### GZIP

```sql
CREATE TABLE logs_gzip
WITH (
  format = 'PARQUET',
  parquet_compression = 'GZIP'
) AS SELECT * FROM source;
```

**Characteristics**:
- Compression ratio: ~4-6x (better than Snappy)
- Decompression speed: Slower (100 MB/s)
- CPU usage: Higher
- Use case: Cold storage, infrequent access, want smaller files

#### ZSTD (Athena Engine v3+)

```sql
CREATE TABLE logs_zstd
WITH (
  format = 'PARQUET',
  parquet_compression = 'ZSTD'
) AS SELECT * FROM source;
```

**Characteristics**:
- Compression ratio: ~4-6x (similar to GZIP)
- Decompression speed: Fast (between Snappy and GZIP)
- CPU usage: Medium
- Use case: Best balance of compression and speed (modern choice)

#### UNCOMPRESSED

```sql
CREATE TABLE logs_uncompressed
WITH (
  format = 'PARQUET',
  parquet_compression = 'UNCOMPRESSED'
) AS SELECT * FROM source;
```

**Use case**: Rarely used, only for already-compressed data or debugging

### Compression Comparison

```sql
-- Example data: 1 TB CSV logs
-- After conversion:

-- SNAPPY (recommended)
Size: 250 GB (75% savings)
Query time: 10s
Cost: $1.25 per query

-- GZIP
Size: 150 GB (85% savings)
Query time: 15s (slower decompression)
Cost: $0.75 per query

-- ZSTD (best balance)
Size: 160 GB (84% savings)
Query time: 11s
Cost: $0.80 per query

-- CSV (original)
Size: 1 TB
Query time: 120s
Cost: $5.00 per query
```

**Recommendation**: Use SNAPPY for most cases, ZSTD if available, GZIP for cold data.

## ORC Format

### When to Use ORC

**Use ORC if**:
- Migrating from Hive
- Using Apache Hive ecosystem
- Need Hive ACID transactions
- Team already familiar with ORC

**Use Parquet instead if**:
- Starting fresh in AWS
- Using Spark, Pandas, or other tools
- Want broader ecosystem support

### Creating ORC Tables

```sql
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  user_id STRING,
  timestamp TIMESTAMP
)
STORED AS ORC
LOCATION 's3://bucket/logs/';

-- With compression
CREATE TABLE logs_orc
WITH (
  format = 'ORC',
  orc_compression = 'ZLIB'
) AS SELECT * FROM source;
```

### ORC Compression Options

```sql
-- ZLIB (default)
orc_compression = 'ZLIB'  -- Good compression, slower

-- SNAPPY
orc_compression = 'SNAPPY'  -- Faster, less compression

-- NONE
orc_compression = 'NONE'
```

### ORC vs Parquet

```sql
-- Performance comparison on 1 TB dataset

-- Parquet (Snappy)
Storage: 250 GB
Query SELECT col1, col2: 8s
Ecosystem: Excellent (Spark, Pandas, Arrow, etc.)

-- ORC (Zlib)
Storage: 200 GB (better compression)
Query SELECT col1, col2: 9s (slightly slower)
Ecosystem: Good (Hive, Presto)

-- Verdict: Both are excellent, Parquet has wider adoption
```

## Avro Format

### When to Use Avro

**Good for**:
- Streaming data (Kafka, Kinesis)
- Schema evolution needs
- Write-heavy workloads
- Row-based access patterns

**Not ideal for**:
- Analytical queries (columnar is better)
- Read-heavy workloads
- Cost optimization (larger files)

### Creating Avro Tables

```sql
CREATE EXTERNAL TABLE events (
  event_id STRING,
  event_type STRING,
  data STRING
)
STORED AS AVRO
LOCATION 's3://bucket/events/';

-- CTAS
CREATE TABLE events_avro
WITH (
  format = 'AVRO'
) AS SELECT * FROM source;
```

### Avro Use Cases

```sql
-- Streaming pipeline
Kafka/Kinesis → S3 (Avro) → Athena

-- Benefits:
-- - Fast writes from stream
-- - Schema embedded in files
-- - Easy schema evolution

-- Optimization:
-- Convert to Parquet for analytics
CREATE TABLE events_parquet
WITH (format = 'PARQUET')
AS SELECT * FROM events_avro;
```

## JSON Format

### When to Use JSON

**Use JSON for**:
- API responses stored in S3
- Semi-structured data
- Quick prototyping
- Data that changes structure frequently

**Don't use JSON for**:
- Production analytics (too slow)
- Large datasets (too expensive)
- Frequent queries (poor performance)

### Creating JSON Tables

```sql
CREATE EXTERNAL TABLE api_logs (
  request_id STRING,
  endpoint STRING,
  response STRUCT<
    status INT,
    body STRING
  >
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://bucket/api-logs/';

-- Querying nested JSON
SELECT
  request_id,
  response.status,
  response.body
FROM api_logs;
```

### JSON Optimization

```sql
-- ❌ Bad: Keep JSON for production
SELECT * FROM json_logs;  -- Expensive, slow

-- ✅ Good: Convert to Parquet
CREATE TABLE logs_parquet
WITH (format = 'PARQUET')
AS
SELECT
  request_id,
  endpoint,
  response.status as response_status,
  response.body as response_body
FROM json_logs;

-- Now queries are 10-100x faster
```

### JSON with Compression

```sql
-- JSON files with GZIP compression
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  data STRING
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://bucket/logs/'
TBLPROPERTIES (
  'has_encrypted_data'='false',
  'compression_type'='gzip'
);

-- Athena automatically decompresses .json.gz files
```

## CSV Format

### When to Use CSV

**Use CSV for**:
- Quick data exploration
- Small datasets (< 1 GB)
- Human readability
- Simple flat data
- Temporary/staging tables

**Don't use CSV for**:
- Production analytics
- Large datasets
- Frequent queries
- Complex data types

### Creating CSV Tables

```sql
CREATE EXTERNAL TABLE logs (
  request_id STRING,
  user_id STRING,
  timestamp STRING,  -- Note: CSV doesn't preserve types well
  action STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
WITH SERDEPROPERTIES (
  'field.delim' = ',',
  'skip.header.line.count' = '1'
)
STORED AS TEXTFILE
LOCATION 's3://bucket/logs-csv/';
```

### CSV with Custom Delimiter

```sql
-- Tab-separated values
WITH SERDEPROPERTIES (
  'field.delim' = '\t'
)

-- Pipe-separated
WITH SERDEPROPERTIES (
  'field.delim' = '|'
)

-- With quoted fields
WITH SERDEPROPERTIES (
  'field.delim' = ',',
  'quoteChar' = '"',
  'escapeChar' = '\\'
)
```

### CSV Optimization Path

```sql
-- Step 1: Create CSV table (existing data)
CREATE EXTERNAL TABLE logs_csv (...)
STORED AS TEXTFILE
LOCATION 's3://bucket/logs-csv/';

-- Step 2: Convert to Parquet with partitions
CREATE TABLE logs_parquet
WITH (
  format = 'PARQUET',
  parquet_compression = 'SNAPPY',
  partitioned_by = ARRAY['date_partition']
) AS
SELECT
  request_id,
  user_id,
  CAST(timestamp AS TIMESTAMP) as timestamp,  -- Fix types
  action,
  DATE_FORMAT(CAST(timestamp AS TIMESTAMP), '%Y-%m-%d') as date_partition
FROM logs_csv;

-- Step 3: Query optimized table
SELECT * FROM logs_parquet
WHERE date_partition = '2024-01-15';

-- Result: 80-90% cost reduction, 10-100x faster
```

## Format Conversion Strategies

### Strategy 1: CTAS (Simplest)

```sql
-- One-time conversion
CREATE TABLE target
WITH (
  format = 'PARQUET',
  parquet_compression = 'SNAPPY',
  external_location = 's3://bucket/target/'
) AS
SELECT * FROM source;
```

**Pros**:
- Simple, one SQL statement
- Athena handles everything

**Cons**:
- Scans entire source table ($$$)
- Can timeout on large datasets

### Strategy 2: Incremental Conversion

```sql
-- Convert one partition at a time
CREATE TABLE target_parquet
WITH (
  format = 'PARQUET',
  partitioned_by = ARRAY['date_partition']
) AS
SELECT * FROM source_csv
WHERE date_partition = '2024-01-15';

-- Repeat for each partition
INSERT INTO target_parquet
SELECT * FROM source_csv
WHERE date_partition = '2024-01-16';
```

**Pros**:
- Lower per-query cost
- Can run in parallel
- Less likely to timeout

**Cons**:
- More manual work
- Requires scripting

### Strategy 3: AWS Glue ETL Job

```python
# Glue PySpark job
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)

# Read CSV
datasource = glueContext.create_dynamic_frame.from_catalog(
    database = "my_database",
    table_name = "logs_csv"
)

# Write Parquet
glueContext.write_dynamic_frame.from_options(
    frame = datasource,
    connection_type = "s3",
    connection_options = {
        "path": "s3://bucket/logs-parquet/"
    },
    format = "parquet",
    format_options = {
        "compression": "snappy"
    }
)

job.commit()
```

**Pros**:
- Handles large datasets
- Can transform data during conversion
- Automated, repeatable
- No Athena query costs

**Cons**:
- Requires Glue setup
- More complex
- Glue DPU costs

### Strategy 4: Spark (Self-Managed)

```python
# PySpark conversion
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("Convert").getOrCreate()

# Read CSV
df = spark.read.csv("s3://bucket/logs-csv/", header=True, inferSchema=True)

# Add partition column
from pyspark.sql.functions import to_date
df = df.withColumn("date_partition", to_date("timestamp"))

# Write Parquet with partitioning
df.write \
  .partitionBy("date_partition") \
  .parquet("s3://bucket/logs-parquet/", compression="snappy")
```

**Pros**:
- Full control
- Can run on EMR or local Spark
- Complex transformations possible

**Cons**:
- Need Spark cluster
- More code to maintain

## Advanced Topics

### Nested Data Types in Parquet

```sql
-- Parquet handles complex types efficiently
CREATE TABLE events (
  event_id STRING,
  user STRUCT<
    id STRING,
    name STRING,
    email STRING
  >,
  tags ARRAY<STRING>,
  metadata MAP<STRING, STRING>
)
STORED AS PARQUET
LOCATION 's3://bucket/events/';

-- Query nested data
SELECT
  event_id,
  user.email,
  tags[1] as first_tag,
  metadata['source'] as source
FROM events;

-- Column pruning works on nested fields!
-- Only reads user.email, not entire user struct
```

### Column Encoding in Parquet

Parquet automatically chooses encoding based on data:

- **Dictionary encoding**: For low-cardinality columns (status, region)
- **Run-length encoding**: For repeated values
- **Delta encoding**: For sorted numbers (timestamps, IDs)
- **Bit-packing**: For small integers

**You don't need to configure this** - Parquet handles it automatically!

### File Size Optimization

```sql
-- ❌ Bad: Many small files (< 128 MB)
-- Slows down queries due to S3 list operations
s3://bucket/logs/file1.parquet (10 MB)
s3://bucket/logs/file2.parquet (15 MB)
... (1000 files)

-- ✅ Good: Fewer large files (128 MB - 1 GB)
s3://bucket/logs/file1.parquet (256 MB)
s3://bucket/logs/file2.parquet (256 MB)
... (10 files)

-- Compact small files using CTAS
CREATE TABLE logs_compacted
WITH (
  format = 'PARQUET',
  external_location = 's3://bucket/logs-compacted/'
) AS
SELECT * FROM logs_small_files;
```

### Partition File Pruning

```sql
-- Parquet row groups have statistics (min/max per column)
-- Athena uses these to skip row groups

-- Example: Filter on timestamp
SELECT * FROM logs
WHERE timestamp >= TIMESTAMP '2024-01-15 10:00:00'
  AND timestamp < TIMESTAMP '2024-01-15 11:00:00';

-- Athena:
-- 1. Reads partition (date_partition=2024-01-15)
-- 2. Reads row group statistics
-- 3. Skips row groups outside time range
-- 4. Only reads relevant row groups

-- Result: Scans only 10% of partition data
```

## Decision Matrix

### Choose Parquet when:
- ✅ Analytical queries (most common)
- ✅ Read-heavy workloads
- ✅ Wide tables (many columns)
- ✅ Need column pruning
- ✅ Want best Athena performance
- ✅ Using Spark, Pandas, or other tools

### Choose ORC when:
- ✅ Migrating from Hive
- ✅ Already using ORC in pipeline
- ✅ Need Hive ACID
- ✅ Slightly better compression needed

### Choose Avro when:
- ✅ Streaming data sources
- ✅ Schema evolution required
- ✅ Write-heavy workload
- ✅ Row-based access patterns

### Choose JSON when:
- ✅ Prototyping
- ✅ Small datasets (< 1 GB)
- ✅ Semi-structured data
- ✅ Human readability important
- ⚠️ Plan to convert to Parquet later

### Choose CSV when:
- ✅ Temporary/staging data
- ✅ Very small datasets (< 100 MB)
- ✅ Quick exploration
- ✅ Human readability critical
- ⚠️ Convert to Parquet for production

## Best Practices

1. **Default to Parquet + Snappy**
   - Best balance for most workloads
   - 80-90% cost savings vs CSV/JSON
   - Wide ecosystem support

2. **Convert legacy formats ASAP**
   - CSV → Parquet: 80-90% cost reduction
   - JSON → Parquet: 80-90% cost reduction
   - Pays for itself in days

3. **Combine with partitioning**
   - Partitioning + Parquet = 95%+ cost reduction
   - Both are essential for production

4. **Use ZSTD if available**
   - Better than Snappy compression
   - Faster than GZIP decompression
   - Requires Athena Engine v3

5. **Monitor file sizes**
   - Target: 128 MB - 1 GB per file
   - Compact small files regularly
   - Avoid creating too many small files

6. **Test with your data**
   - Convert small sample
   - Compare query costs
   - Measure performance
   - Then convert full dataset

## Cost Comparison Example

```
Scenario: 1 TB of log data, queried 100 times/month

CSV (uncompressed):
- Storage: 1 TB × $0.023/GB = $23.55/month
- Queries: 1 TB × 100 × $5/TB = $500/month
- Total: $523.55/month

Parquet (Snappy) + Daily Partitions:
- Storage: 200 GB × $0.023/GB = $4.60/month
- Queries: 10 GB × 100 × $5/TB = $5/month (95% partition pruning)
- Total: $9.60/month

💰 Savings: $513.95/month (98% cost reduction!)
```

## Quick Reference

| Task | Command |
|------|---------|
| CSV → Parquet | `CREATE TABLE t WITH (format='PARQUET') AS SELECT * FROM csv_table` |
| JSON → Parquet | `CREATE TABLE t WITH (format='PARQUET') AS SELECT * FROM json_table` |
| Add compression | `WITH (parquet_compression='SNAPPY')` |
| Add partitions | `WITH (partitioned_by=ARRAY['date_col'])` |
| Compact files | `CREATE TABLE t AS SELECT * FROM source` |

**Recommended stack**: Parquet + Snappy + Daily Partitions = 🚀

## References

- Parquet Format: https://parquet.apache.org/docs/
- ORC Format: https://orc.apache.org/docs/
- Athena Compression: https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html
- Athena SerDes: https://docs.aws.amazon.com/athena/latest/ug/supported-serdes.html
