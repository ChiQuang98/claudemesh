---
name: performance-tuning
description: Database performance tuning and optimization techniques. Use when diagnosing performance issues or optimizing database operations.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Database Performance Tuning

## Overview
Systematic approach to optimizing database performance across multiple layers.

## Performance Tuning Methodology

### The Optimization Process
```
1. Measure → 2. Identify Bottleneck → 3. Fix → 4. Verify → 5. Monitor
```

**Golden Rules:**
- Measure first, optimize second
- Fix the biggest bottleneck first
- One change at a time
- Verify improvements
- Document changes

## 1. Query Performance Analysis

### Using EXPLAIN

**PostgreSQL:**
```sql
-- Basic explain plan
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- With actual execution time
EXPLAIN (ANALYZE) SELECT * FROM orders WHERE user_id = 123;

-- With detailed statistics
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT u.*, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- Key metrics to check:
-- - Seq Scan (bad for large tables) → Need index
-- - Index Scan (good) → Using index
-- - Index Only Scan (excellent) → Covering index
-- - Hash Join (usually fast for large datasets)
-- - Nested Loop (slow for large datasets, good for small)
-- - actual time vs planning time
-- - rows vs actual rows (estimation accuracy)
-- - buffers (shared hit vs read = cache effectiveness)
```

**MySQL:**
```sql
-- Basic explain
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- Extended format (JSON)
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE user_id = 123;

-- With actual execution (MySQL 8.0.18+)
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- Key columns:
-- - type: ALL (bad, full scan), index (good), range (good)
-- - possible_keys: Indexes considered
-- - key: Index actually used
-- - rows: Estimated rows examined
-- - Extra: Using index (good), Using filesort (bad), Using temporary (bad)
```

**SQL Server:**
```sql
-- Show execution plan
SET SHOWPLAN_TEXT ON;
GO
SELECT * FROM orders WHERE user_id = 123;
GO

-- Actual execution plan with statistics
SET STATISTICS PROFILE ON;
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
GO
SELECT * FROM orders WHERE user_id = 123;
GO

-- Look for:
-- - Table Scan (bad) vs Index Seek (good)
-- - Key Lookup (consider covering index)
-- - Sort (consider index)
-- - Hash Match (may need index)
-- - Nested Loops (may need better join order)
```

### Identifying Problem Queries

**PostgreSQL - pg_stat_statements:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries by total time
SELECT
    query,
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time / 1000 as avg_seconds,
    max_exec_time / 1000 as max_seconds,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Find most frequently executed queries
SELECT
    query,
    calls,
    total_exec_time / 1000 as total_seconds
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;

-- Find queries with high I/O
SELECT
    query,
    calls,
    (shared_blks_hit + shared_blks_read) as total_blocks,
    shared_blks_hit,
    shared_blks_read,
    ROUND(100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read), 2) as cache_hit_ratio
FROM pg_stat_statements
WHERE (shared_blks_hit + shared_blks_read) > 0
ORDER BY (shared_blks_hit + shared_blks_read) DESC
LIMIT 20;
```

**MySQL - Slow Query Log:**
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Check log location
SHOW VARIABLES LIKE 'slow_query_log_file';

-- Analyze with mysqldumpslow (command line)
-- mysqldumpslow -s t -t 10 /var/log/mysql/slow.log  -- Top 10 by time
-- mysqldumpslow -s c -t 10 /var/log/mysql/slow.log  -- Top 10 by count
```

**SQL Server - Query Store:**
```sql
-- Enable Query Store
ALTER DATABASE current_db SET QUERY_STORE = ON;
GO

-- Find resource-intensive queries
SELECT
    query_id,
    query_sql_text,
    execution_count,
    avg_duration / 1000000 as avg_duration_seconds,
    total_duration / 1000000 as total_duration_seconds,
    avg_logical_io_reads,
    avg_physical_io_reads
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
ORDER BY avg_duration DESC;
```

## 2. Connection Pooling

### Why Pooling Matters

**Without pooling (bad):**
```javascript
// ❌ Bad: New connection per request
for (let i = 0; i < 1000; i++) {
    const conn = await createConnection();  // Expensive!
    await conn.query('SELECT * FROM users WHERE id = $1', [i]);
    await conn.end();
}
// Time: ~1000 * connection_time (seconds to minutes)
```

**With pooling (good):**
```javascript
// ✅ Good: Reuse connections
const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    max: 20,              // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

for (let i = 0; i < 1000; i++) {
    const client = await pool.connect();  // Fast!
    await client.query('SELECT * FROM users WHERE id = $1', [i]);
    client.release();
}
// Time: ~1000 * query_time (milliseconds)
```

### Pool Configuration

**Node.js (pg/PostgreSQL):**
```javascript
const pool = new Pool({
    // Connection settings
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    // Pool settings
    max: 20,                    // Maximum connections
    min: 5,                     // Minimum connections
    idleTimeoutMillis: 30000,   // Close idle clients after 30s
    connectionTimeoutMillis: 2000,  // Return error after 2s if no connection

    // Advanced settings
    maxUses: 7500,              // Close connection after this many uses
    statement_timeout: 10000,   // Query timeout (10s)
    query_timeout: 10000,
});
```

**Python (psycopg2):**
```python
from psycopg2 import pool

# Simple connection pool
db_pool = pool.SimpleConnectionPool(
    minconn=5,
    maxconn=20,
    host='localhost',
    database='mydb',
    user='user',
    password='password'
)

# Thread-safe pool
db_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host='localhost',
    database='mydb',
    user='user',
    password='password'
)

# Usage
conn = db_pool.getconn()
try:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchall()
finally:
    db_pool.putconn(conn)
```

**Java (HikariCP - Recommended):**
```java
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
config.setUsername("user");
config.setPassword("password");

// Pool settings
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(2000);  // 2 seconds
config.setIdleTimeout(30000);       // 30 seconds
config.setMaxLifetime(1800000);     // 30 minutes

// Performance tuning
config.setAutoCommit(false);
config.setConnectionTestQuery("SELECT 1");

HikariDataSource ds = new HikariDataSource(config);
```

### Pool Sizing Formula

**Formula:**
```
connections = ((core_count * 2) + effective_spindle_count)
```

**Practical sizing:**
```javascript
// For a 4-core machine with SSD
cores = 4
connections = (cores * 2) + 1  // = 9
// Round up to ~20 for web apps (allows for spikes)

// For database connections specifically:
// - Small apps: 5-10 connections
// - Medium apps: 10-20 connections
// - Large apps: 20-50 connections
// - Very large: 50-100 (rarely need more)

// Sign of too many connections:
// - Database CPU > 80%
// - High lock contention
// - Diminishing returns

// Sign of too few:
// - Application waiting for connections
// - Timeouts during load
```

## 3. Caching Strategies

### Query Result Caching

**Application-level caching (Redis/Memcached):**
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
    // Check cache first
    const cached = await client.get(`user:${userId}`);
    if (cached) {
        return JSON.parse(cached);
    }

    // Cache miss - query database
    const result = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
    );

    // Store in cache (5 minutes)
    await client.setex(`user:${userId}`, 300, JSON.stringify(result.rows[0]));

    return result.rows[0];
}
```

### Materialized Views (PostgreSQL)

```sql
-- Create materialized view for expensive aggregations
CREATE MATERIALIZED VIEW user_stats AS
SELECT
    u.id,
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent,
    AVG(o.total) as avg_order_value,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
WITH DATA;

-- Create indexes on MV
CREATE INDEX idx_user_stats_id ON user_stats(id);
CREATE INDEX idx_user_stats_total ON user_stats(total_spent DESC);

-- Query (super fast - pre-computed)
SELECT * FROM user_stats WHERE id = 123;

-- Refresh (usually done via cron job)
REFRESH MATERIALIZED VIEW user_stats;

-- Concurrent refresh (doesn't block reads - requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

### Database-Specific Caching

**PostgreSQL Configuration:**
```sql
-- shared_buffers: 25% of RAM (on dedicated DB server)
-- effective_cache_size: 75% of RAM
-- work_mem: Per-operation memory
-- maintenance_work_mem: Maintenance operations

-- Example: 16GB RAM server
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 512MB

-- Check settings
SHOW shared_buffers;
SHOW work_mem;
```

**MySQL Configuration:**
```ini
# InnoDB buffer pool (70-80% of RAM for dedicated DB)
innodb_buffer_pool_size = 12G  # For 16GB server

-- Multiple buffer pools for concurrency
innodb_buffer_pool_instances = 4

-- Query cache (disabled in MySQL 8.0+ - use application caching)
# query_cache_type = 1
# query_cache_size = 256M

-- Thread cache
thread_cache_size = 16

-- Table cache
table_open_cache = 4000
```

**SQL Server Configuration:**
```sql
-- Max server memory (leave some for OS)
sp_configure 'show advanced options', 1;
RECONFIGURE;
sp_configure 'max server memory (MB)', 12000;  -- 12GB for 16GB server
RECONFIGURE;

-- Min memory per query
sp_configure 'min memory per query (MB)', 4;
RECONFIGURE;

-- Check plan cache
SELECT
    cacheobjtype,
    objtype,
    COUNT(*) as number_of_plans,
    SUM(CAST(size_in_bytes AS bigint)) / 1024 / 1024 AS size_in_mb
FROM sys.dm_exec_cached_plans
GROUP BY cacheobjtype, objtype
ORDER BY size_in_mb DESC;
```

## 4. Batch Operations

### Bulk Inserts

**PostgreSQL:**
```sql
-- ❌ Bad: Multiple individual inserts
INSERT INTO logs (message, level) VALUES ('error 1', 'ERROR');
INSERT INTO logs (message, level) VALUES ('error 2', 'ERROR');
-- ... 1000 more

-- ✅ Good: Single bulk insert
INSERT INTO logs (message, level) VALUES
    ('error 1', 'ERROR'),
    ('error 2', 'ERROR'),
    ('error 3', 'ERROR');
-- ... up to thousands of rows

-- ✅ Better: COPY command for very large datasets
COPY logs (message, level) FROM '/tmp/logs.csv' CSV;

-- Application example (Node.js)
const values = logs.map(log => `('${log.message}', '${log.level}')`);
await db.query(`INSERT INTO logs (message, level) VALUES ${values.join(',')}`);
```

**MySQL:**
```sql
-- Single bulk insert
INSERT INTO logs (message, level) VALUES
    ('error 1', 'ERROR'),
    ('error 2', 'ERROR'),
    ('error 3', 'ERROR');

-- LOAD DATA INFILE for very large datasets
LOAD DATA INFILE '/tmp/logs.csv'
INTO TABLE logs
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(message, level);
```

### Bulk Updates

**PostgreSQL:**
```sql
-- ❌ Bad: Individual updates
UPDATE products SET price = 100 WHERE id = 1;
UPDATE products SET price = 200 WHERE id = 2;
UPDATE products SET price = 300 WHERE id = 3;

-- ✅ Good: Single update with CASE
UPDATE products
SET price = CASE
    WHEN id = 1 THEN 100
    WHEN id = 2 THEN 200
    WHEN id = 3 THEN 300
END
WHERE id IN (1, 2, 3);

-- ✅ Better: FROM clause for complex updates
UPDATE products p
SET price = new_prices.price
FROM (VALUES
    (1, 100),
    (2, 200),
    (3, 300)
) AS new_prices(id, price)
WHERE p.id = new_prices.id;
```

### Bulk Deletes

```sql
-- ❌ Bad: Many individual deletes
DELETE FROM logs WHERE id = 1;
DELETE FROM logs WHERE id = 2;
DELETE FROM logs WHERE id = 3;

-- ✅ Good: Single delete with IN
DELETE FROM logs WHERE id IN (1, 2, 3, 4, 5);

-- ✅ Better: Batch delete for large datasets
-- Delete in batches to avoid long locks
DELETE FROM logs
WHERE id IN (
    SELECT id FROM logs
    WHERE created_at < '2023-01-01'
    LIMIT 10000
);
-- Repeat until no more rows
```

## 5. Transaction Optimization

### Keep Transactions Short

```sql
-- ❌ Bad: Long transaction with user input
BEGIN;
SELECT * FROM products WHERE id = 1 FOR UPDATE;
-- Wait for user input (seconds to minutes)
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;

-- ✅ Good: Short transaction
-- Get data first (no lock)
SELECT * FROM products WHERE id = 1;
-- User input happens here
-- Quick transaction
BEGIN;
UPDATE products SET stock = stock - 1 WHERE id = 1
WHERE id = 1 AND stock > 0;
COMMIT;
```

### Use Appropriate Isolation Levels

**PostgreSQL:**
```sql
-- Read Committed (default) - Good for most cases
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read - For reports/exports
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable - Strictest, slowest
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

**MySQL:**
```sql
-- Read Committed
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read (default InnoDB)
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### Avoid Lock Contention

```sql
-- ❌ Bad: SELECT ... FOR UPDATE locks rows
BEGIN;
SELECT * FROM products WHERE id = 1 FOR UPDATE;
-- Do some work
UPDATE products SET views = views + 1 WHERE id = 1;
COMMIT;

-- ✅ Good: Use optimistic locking or atomic updates
UPDATE products
SET views = views + 1,
    last_viewed = CURRENT_TIMESTAMP
WHERE id = 1;

-- Or use version column for optimistic locking
UPDATE products
SET price = 100,
    version = version + 1
WHERE id = 1 AND version = 5;
-- Check rows affected - if 0, someone else updated it
```

## 6. Schema Optimization

### Normalization vs Denormalization

**Normalized (OLTP):**
```sql
-- Good for transactional systems
-- Third normal form (3NF)
-- Less data duplication
-- Better data integrity
-- Slower for complex queries

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(100)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    total DECIMAL(10,2),
    created_at TIMESTAMP
);
```

**Denormalized (OLAP):**
```sql
-- Good for analytics/read-heavy workloads
-- Faster queries
-- More data duplication
-- Need to handle updates carefully

CREATE TABLE orders_denormalized (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(255),  -- Denormalized
    country VARCHAR(100),         -- Denormalized
    city VARCHAR(100),            -- Denormalized
    total DECIMAL(10,2),
    created_at TIMESTAMP
);

-- Queries don't need JOINs
SELECT * FROM orders_denormalized WHERE country = 'USA';
```

### Partitioning

**PostgreSQL Partitioning (Declarative):**
```sql
-- Create partitioned table
CREATE TABLE orders (
    id SERIAL,
    user_id INT,
    total DECIMAL(10,2),
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE orders_2024_q3 PARTITION OF orders
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE orders_2024_q4 PARTITION OF orders
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- Query only scans relevant partition
SELECT * FROM orders WHERE created_at >= '2024-05-01';
-- Only scans orders_2024_q2, q3, q4

-- Benefits:
-- Faster queries (partition pruning)
-- Easier maintenance (drop old partitions)
-- Better parallel query execution
```

**MySQL Partitioning:**
```sql
-- Range partitioning
CREATE TABLE orders (
    id INT AUTO_INCREMENT,
    user_id INT,
    total DECIMAL(10,2),
    created_at TIMESTAMP,
    PRIMARY KEY (id, created_at)
)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);

-- Hash partitioning (for even distribution)
CREATE TABLE logs (
    id BIGINT AUTO_INCREMENT,
    user_id INT,
    message TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (id, created_at)
)
PARTITION BY HASH(user_id)
PARTITIONS 8;
```

### Table Partitioning Use Cases

**Good candidates for partitioning:**
- Tables > 100GB
- Time-series data (logs, metrics)
- Data that has natural rolling window
- Tables where old data is rarely accessed
- Queries that mostly read recent data

**Poor candidates:**
- Small tables
- Tables without natural partitioning key
- Tables with cross-partition transactions
- Tables with complex foreign key relationships

## 7. Query Optimization Techniques

### Subquery vs JOIN

```sql
-- ❌ Sometimes slower: Subquery in WHERE
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE country = 'USA');

-- ✅ Often faster: JOIN
SELECT o.*
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE u.country = 'USA';

-- ❌ Bad: Correlated subquery
SELECT *,
    (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count
FROM orders;

-- ✅ Good: JOIN
SELECT o.*, COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;
```

### EXISTS vs IN vs JOIN

```sql
-- EXISTS: Stops at first match (fastest for existence check)
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
    AND o.total > 1000
);

-- IN: Good for small, known lists
SELECT * FROM users
WHERE id IN (1, 5, 10, 100);

-- JOIN: Good when you need data from both tables
SELECT u.*, COUNT(o.id) as order_count
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

### CTEs vs Subqueries

```sql
-- CTE: More readable, easier to maintain
WITH active_users AS (
    SELECT id, name FROM users WHERE last_login > CURRENT_DATE - 30
),
user_orders AS (
    SELECT user_id, COUNT(*) as cnt, SUM(total) as sum
    FROM orders
    WHERE created_at > CURRENT_DATE - 30
    GROUP BY user_id
)
SELECT au.name, uo.cnt, uo.sum
FROM active_users au
LEFT JOIN user_orders uo ON au.id = uo.user_id;

-- Same query with subqueries (less readable)
SELECT au.name, uo.cnt, uo.sum
FROM (
    SELECT id, name FROM users WHERE last_login > CURRENT_DATE - 30
) au
LEFT JOIN (
    SELECT user_id, COUNT(*) as cnt, SUM(total) as sum
    FROM orders
    WHERE created_at > CURRENT_DATE - 30
    GROUP BY user_id
) uo ON au.id = uo.user_id;
```

## 8. Hardware Optimization

### Database Server Recommendations

**CPU:**
- More cores = better concurrency
- 4-8 cores for small/medium databases
- 16-32 cores for large databases
- High clock speed helps single queries

**RAM (Critical!):**
```
Dedicated DB server: 70-80% of RAM to buffer pool
Shared server: 40-50% of RAM to buffer pool

Example for 16GB server (dedicated DB):
- PostgreSQL: shared_buffers = 4GB (25%), effective_cache_size = 12GB (75%)
- MySQL: innodb_buffer_pool_size = 12GB (75%)
- SQL Server: max_server_memory = 12-13GB (75-80%)
```

**Storage:**
```
Tier 1 (Production): SSD/NVMe
- Random I/O: 100,000+ IOPS
- Critical for OLTP workloads

Tier 2: SATA SSD
- Random I/O: 10,000-50,000 IOPS

Tier 3: HDD
- Use for: Archives, backups, data warehouse
- Poor for OLTP

RAID configurations:
- RAID 10: Best for databases (redundancy + performance)
- RAID 5: Poor write performance
- SSD + RAID 10: Ideal setup
```

**Network:**
- 1Gbps minimum for production
- 10Gbps for high-throughput systems
- Low latency is critical for distributed databases

## 9. Monitoring and Alerting

### Key Metrics to Monitor

**Performance Metrics:**
```sql
-- Query performance
-- - Average query time
-- - P95, P99 query latency
-- - Slow query count

-- Connection metrics
-- - Active connections
-- - Idle connections
-- - Connection wait time

-- Cache metrics
-- - Buffer pool hit ratio (should be > 95%)
-- - Query cache hit ratio (MySQL)

-- Lock metrics
-- - Lock waits
-- - Deadlocks
-- - Lock timeouts

-- Table/Index metrics
-- - Table scans vs index scans
-- - Index usage
-- - Fragmentation
```

**PostgreSQL Monitoring:**
```sql
-- Check active queries
SELECT
    pid,
    now() - query_start as duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Check table size
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
ORDER BY bytes DESC;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

**MySQL Monitoring:**
```sql
-- Check active connections
SHOW PROCESSLIST;

-- Check InnoDB status
SHOW ENGINE INNODB STATUS\G

-- Check table sizes
SELECT
    table_schema,
    table_name,
    ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
ORDER BY (data_length + index_length) DESC;
```

## 10. Performance Tuning Checklist

### Database Configuration
- [ ] Buffer pool / shared_buffers sized appropriately
- [ ] Work memory configured
- [ ] Connection pool configured and sized
- [ ] Query cache configured (if applicable)
- [ ] Logging enabled (slow query, error logs)
- [ ] Statistics update job configured

### Query Optimization
- [ ] All slow queries identified with EXPLAIN
- [ ] Missing indexes added
- [ ] N+1 queries eliminated
- [ ] SELECT * replaced with specific columns
- [ ] Subqueries optimized to JOINs where appropriate
- [ ] Batch operations implemented

### Schema Optimization
- [ ] Appropriate data types used
- [ ] Foreign keys indexed
- [ ] Partitioning considered for large tables
- [ ] Denormalization considered for read-heavy workloads
- [ ] Normalization for write-heavy workloads

### Application Optimization
- [ ] Connection pooling implemented
- [ ] Prepared statements used
- [ ] Result caching implemented
- [ ] Transactions kept short
- [ ] Batch operations used
- [ ] Proper error handling and retry logic

### Monitoring
- [ ] Performance metrics collected
- [ ] Alert thresholds configured
- [ ] Regular performance reviews scheduled
- [ ] Baseline metrics established
- [ ] Capacity planning in place

## Common Performance Anti-Patterns

1. **Using SELECT \*** - Fetches unnecessary data
2. **N+1 queries** - Application-level loops with queries
3. **Missing indexes on foreign keys** - Slow JOINs
4. **Not using connection pooling** - High connection overhead
5. **Long-running transactions** - Locks and blocking
6. **Functions on indexed columns** - Prevents index usage
7. **Too many indexes** - Slow writes
8. **Monitoring without action** - Collecting data but not optimizing
9. **Premature optimization** - Optimizing without measuring
10. **Ignoring database configuration** - Using default settings

## Quick Wins

1. Add indexes to foreign keys (10-100x improvement common)
2. Replace SELECT * with specific columns (2-10x improvement)
3. Fix N+1 queries (10-100x improvement)
4. Add connection pooling (5-20x improvement)
5. Use prepared statements (5-30% improvement, security too!)
6. Optimize subqueries to JOINs (2-5x improvement)
7. Add caching for frequently accessed data (10-1000x improvement)
8. Tune buffer pool size (2-10x improvement)
9. Enable slow query log and fix top 10 queries (varies)
10. Batch operations (5-50x improvement)
