---
name: index-strategies
description: Database indexing strategies and patterns. Use when designing indexes, optimizing query performance, or planning database schema.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Database Index Strategies

## Overview
Comprehensive guide to database indexing for optimal query performance.

## Index Fundamentals

### What is an Index?
An index is a data structure (typically B-tree) that improves data retrieval speed at the cost of additional storage and slower write operations.

### When to Create Indexes
```sql
-- Create indexes on columns used in:
-- 1. WHERE clauses
-- 2. JOIN conditions
-- 3. ORDER BY clauses
-- 4. GROUP BY clauses
-- 5. Foreign key columns
```

### When NOT to Create Indexes
- Small tables (< 1000 rows)
- Columns with low cardinality (boolean, status with few values)
- Tables with heavy write/read ratios
- Columns frequently updated
- Queries that return > 5-10% of table data

## Index Types

### 1. B-Tree Index (Default)

**Best for:** Equality and range queries
```sql
-- PostgreSQL / MySQL
CREATE INDEX idx_users_email ON users(email);

-- SQL Server
CREATE INDEX idx_users_email ON users(email);

-- Equality queries
SELECT * FROM users WHERE email = 'user@example.com';

-- Range queries
SELECT * FROM users WHERE created_at > '2024-01-01';

-- Sort
SELECT * FROM users ORDER BY email;

-- All use the same B-tree index
```

**Multi-column B-Tree Index:**
```sql
-- Index on multiple columns
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- ✅ Uses index: Leading column in WHERE
SELECT * FROM orders WHERE user_id = 123;

-- ✅ Uses index: Both columns in WHERE
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';

-- ✅ Uses index: Leading column in WHERE, second in ORDER BY
SELECT * FROM orders WHERE user_id = 123 ORDER BY created_at;

-- ❌ Doesn't use index efficiently: Non-leading column only
SELECT * FROM orders WHERE created_at > '2024-01-01';

-- ❌ Doesn't use index: Second column in WHERE, wrong ORDER BY
SELECT * FROM orders WHERE created_at > '2024-01-01' ORDER BY user_id;
```

**Column Order Matters:**
```sql
-- Put most selective column first
-- Cardinality: city (1000) > country (50) > continent (5)
CREATE INDEX idx_locations ON users(city, country, continent);

-- For filtering on country only, this won't help
-- Consider separate index if often queried alone:
CREATE INDEX idx_locations_country ON users(country);
```

### 2. Unique Index

**Best for:** Enforcing data integrity
```sql
-- PostgreSQL / MySQL
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- SQL Server
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Alternative (MySQL, PostgreSQL, SQL Server)
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- Prevents duplicate emails
-- Also acts as index for lookups
```

### 3. Composite Index (Multi-column)

**Strategy: Column Order**
```sql
-- General rule: Most selective, most commonly filtered first
CREATE INDEX idx_events_type_date ON events(event_type, created_at);

-- Query patterns that use this index:
SELECT * FROM events WHERE event_type = 'login';                    -- ✅
SELECT * FROM events WHERE event_type = 'login' ORDER BY created_at; -- ✅
SELECT * FROM events WHERE event_type = 'login' AND created_at > '2024-01-01'; -- ✅

-- Query patterns that don't use it well:
SELECT * FROM events WHERE created_at > '2024-01-01';                -- ❌
SELECT * FROM events WHERE created_at > '2024-01-01' AND event_type = 'login'; -- Partial only
```

**Covering Index (Index-Only Scan):**
```sql
-- Include all columns needed by query
CREATE INDEX idx_orders_covering ON orders(user_id, created_at)
INCLUDE (total, status);  -- SQL Server / PostgreSQL 11+

-- Query can be satisfied from index alone
SELECT user_id, created_at, total, status
FROM orders
WHERE user_id = 123
ORDER BY created_at;

-- Benefits:
-- No table access (faster)
-- Less I/O
-- Better cache efficiency

-- MySQL/PostgreSQL < 11 alternative
CREATE INDEX idx_orders_covering ON orders(user_id, created_at, total, status);
```

### 4. Partial Index (Filtered)

**Best for:** Indexing subset of data
```sql
-- PostgreSQL / SQL Server
-- Index only active users
CREATE INDEX idx_users_active_email
ON users(email)
WHERE is_active = true;

-- Queries that use it:
SELECT * FROM users WHERE is_active = true AND email = 'user@example.com'; -- ✅

-- Queries that don't:
SELECT * FROM users WHERE email = 'user@example.com'; -- ❌ Doesn't specify filter
SELECT * FROM users WHERE is_active = false AND email = 'user@example.com'; -- ❌ Wrong filter

-- Use case: Index recent orders
CREATE INDEX idx_orders_recent ON orders(user_id, created_at)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Use case: Index commonly filtered value
CREATE INDEX idx_tasks_pending ON tasks(user_id, priority)
WHERE status = 'pending';
```

**Benefits:**
- Smaller index size
- Faster index maintenance
- Faster queries
- Reduced storage

### 5. Expression Index (Functional)

**Best for:** Indexing computed values
```sql
-- PostgreSQL
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Now this uses index:
SELECT * FROM users WHERE LOWER(email) = 'USER@EXAMPLE.COM';

-- Common patterns
CREATE INDEX idx_events_date_month ON events(DATE_TRUNC('month', created_at));
CREATE INDEX idx_products_price_with_discount ON products(price * (1 - discount));
CREATE INDEX idx_users_full_name ON users(CONCAT(first_name, ' ', last_name));

-- SQL Server (Computed Column + Index)
ALTER TABLE users ADD email_lower AS LOWER(email);
CREATE INDEX idx_users_email_lower ON users(email_lower);

-- MySQL (cannot index expressions directly, use generated columns in 5.7+)
ALTER TABLE users ADD email_lower VARCHAR(255) AS (LOWER(email)) STORED;
CREATE INDEX idx_users_email_lower ON users(email_lower);
```

### 6. GiST Index (PostgreSQL)

**Best for:** Geometric data, full-text search
```sql
-- PostGIS: Spatial queries
CREATE INDEX idx_places_location ON places USING GIST (coordinates);

-- Full-text search
CREATE INDEX idx_documents_content ON documents USING GIST (to_tsvector('english', content));

-- Range types
CREATE INDEX idx_reservations_dates ON reservations USING GIST (daterange(start_date, end_date));
```

### 7. GIN Index (PostgreSQL)

**Best for:** Array values, JSONB, composite types
```sql
-- Array contains
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

SELECT * FROM posts WHERE 'javascript' = ANY(tags); -- Uses index

-- JSONB containment
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

SELECT * FROM users WHERE metadata @> '{"theme": "dark"}'; -- Uses index

-- Full-text search (better than GiST for large documents)
CREATE INDEX idx_documents_content_fts ON documents USING GIN (to_tsvector('english', content));
```

### 8. Hash Index (PostgreSQL)

**Best for:** Equality queries only
```sql
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- ✅ Uses index
SELECT * FROM users WHERE email = 'user@example.com';

-- ❌ Doesn't use index
SELECT * FROM users WHERE email LIKE 'user@%';
SELECT * FROM users WHERE email > 'a';

-- Note: Usually B-tree is just as fast for equality
-- Use only if you need to save space and only do equality checks
```

### 9. Clustered Index

**SQL Server Default:**
```sql
-- Primary key creates clustered index by default
-- Table data is stored in the index order

-- Choose carefully:
-- Most queries benefit from clustered index on:
-- 1. Frequently queried range
-- 2. Most commonly accessed column
-- 3. Sequential columns (dates, auto-increment IDs)

-- Create clustered index
CREATE CLUSTERED INDEX idx_orders_date ON orders(created_at);

-- Non-clustered indexes reference clustered index
```

**PostgreSQL (CLUSTER):**
```sql
-- Reorder table data based on index
CLUSTER orders USING idx_orders_created_at;

-- Must re-run after updates
-- Not maintained automatically
```

### 10. BRIN Index (PostgreSQL)

**Best for:** Very large tables with natural ordering
```sql
-- For huge tables with data stored sequentially
CREATE INDEX idx_logs_brin ON logs USING BRIN (created_at);

-- Much smaller than B-tree
-- Perfect for time-series data
-- Tables > 100GB

-- Use when:
-- - Table is very large
-- - Data has natural ordering (timestamp, serial ID)
-- - Queries typically scan recent data
-- - Storage is at premium

-- Don't use when:
-- - Data is randomly ordered
-- - Queries access scattered rows
```

## Index Design Patterns

### 1. Foreign Key Indexes

**Always index foreign keys:**
```sql
-- Child table references parent
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP
);

-- Index the foreign key
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Benefits:
-- Faster JOINs
-- Faster cascade deletes
-- Better constraint checking
```

### 2. Join Indexes

**Index columns used in joins:**
```sql
-- Query
SELECT o.*, u.name
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';

-- Indexes needed
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_users_id ON users(id);  -- Primary key usually indexed

-- Composite might be better
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
```

### 3. Sorting Indexes

**Avoid filesort:**
```sql
-- Query
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;

-- Index that covers both WHERE and ORDER BY
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- PostgreSQL: Can use index for ORDER BY even if DESC in CREATE
-- MySQL: Specify DESC if ordering DESC
-- SQL Server: Specifies direction in index
```

### 4. Covering Index Strategy

**Eliminate table access:**
```sql
-- Query
SELECT user_id, created_at, total, status
FROM orders
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;

-- Covering index (SQL Server / PostgreSQL 11+)
CREATE INDEX idx_orders_covering ON orders(user_id, created_at DESC)
INCLUDE (total, status);

-- Traditional covering index (all databases)
CREATE INDEX idx_orders_covering ON orders(user_id, created_at DESC, total, status);

-- Benefits: Index-only scan (no table lookup needed)
```

### 5. Index for LIKE Queries

**Leading wildcard can't use index:**
```sql
-- ❌ Cannot use regular index
SELECT * FROM products WHERE name LIKE '%widget%';

-- ✅ Solution 1: Full-text search (PostgreSQL)
CREATE INDEX idx_products_fts ON products USING GIN (to_tsvector('english', name));
SELECT * FROM products
WHERE to_tsvector('english', name) @@ to_tsquery('widget');

-- ✅ Solution 2: Trigram index (PostgreSQL)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
SELECT * FROM products WHERE name LIKE '%widget%';

-- ✅ Solution 3: Reverse index (MySQL workaround)
-- Store reversed column and query prefix
-- Rarely needed with modern solutions
```

### 6. Partial Index Pattern

**Index commonly filtered subsets:**
```sql
-- Most queries only need recent data
CREATE INDEX idx_logs_recent ON logs(created_at DESC)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Most orders are completed
CREATE INDEX idx_orders_completed ON orders(user_id, created_at)
WHERE status = 'completed';

-- Soft deletes
CREATE INDEX idx_users_active ON users(email)
WHERE deleted_at IS NULL;
```

### 7. Index Inheritance Pattern

**Multiple indexes covering different patterns:**
```sql
-- Queries use different column combinations
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_status_date ON orders(status, created_at);

-- Query optimizer chooses best index
-- Be careful not to create too many indexes
```

## Index Maintenance

### 1. Monitoring Index Usage

**PostgreSQL:**
```sql
-- Check unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

**MySQL:**
```sql
-- No built-in index usage stats
-- Use performance_schema (MySQL 5.7+)
SELECT
    object_schema,
    object_name,
    index_name,
    count_star as index_scans
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
ORDER BY count_star DESC;
```

**SQL Server:**
```sql
-- Check index usage
SELECT
    OBJECT_NAME(i.object_id) as table_name,
    i.name as index_name,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s
    ON i.object_id = s.object_id
    AND i.index_id = s.index_id
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC;
```

### 2. Index Fragmentation

**SQL Server:**
```sql
-- Check fragmentation
SELECT
    OBJECT_NAME(ips.object_id) as table_name,
    i.name as index_name,
    ips.avg_fragmentation_in_percent,
    ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 10
ORDER BY ips.avg_fragmentation_in_percent DESC;

-- Rebuild fragmented indexes
ALTER INDEX idx_name ON table_name REBUILD;

-- Reorganize slightly fragmented
ALTER INDEX idx_name ON table_name REORGANIZE;
```

**PostgreSQL:**
```sql
-- Check bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
ORDER BY pg_indexes_size(schemaname||'.'||tablename) DESC;

-- Reindex specific index
REINDEX INDEX idx_name;

-- Reindex entire table (concurrently - doesn't block writes)
REINDEX INDEX CONCURRENTLY idx_name;
```

**MySQL (InnoDB):**
```sql
-- Rebuild table (also reorganizes indexes)
ALTER TABLE table_name ENGINE=InnoDB;

-- Analyze table for query optimizer
ANALYZE TABLE table_name;

-- Optimize table (reclaims space, reorganizes)
OPTIMIZE TABLE table_name;
```

### 3. Update Statistics

**PostgreSQL:**
```sql
-- Update table statistics
ANALYZE table_name;

-- Update all tables
ANALYZE;

-- Important after:
-- - Bulk inserts/updates/deletes
-- - Creating indexes
-- - Significant data changes
```

**MySQL:**
```sql
-- Update table statistics
ANALYZE TABLE table_name;

-- Update statistics for all tables
-- (Usually automatic, but can force)
-- MySQL 8.0+ handles this automatically
```

**SQL Server:**
```sql
-- Update statistics
UPDATE STATISTICS table_name;

-- Update with full scan
UPDATE STATISTICS table_name WITH FULLSCAN;

-- Update all statistics in database
EXEC sp_updatestats;
```

## Index Best Practices

### DO:
- ✅ Index foreign key columns
- ✅ Index columns used in WHERE, JOIN, ORDER BY
- ✅ Use composite indexes for common column combinations
- ✅ Use partial indexes for filtered data
- ✅ Use covering indexes to avoid table access
- ✅ Consider index-only scans for read-heavy workloads
- ✅ Monitor index usage and remove unused indexes
- ✅ Update statistics after bulk operations
- ✅ Rebuild/reorganize fragmented indexes
- ✅ Test indexes with production-like data volumes

### DON'T:
- ❌ Over-index tables (slows writes, wastes space)
- ❌ Index low-cardinality columns (boolean, status with few values)
- ❌ Index columns with heavy write loads
- ❌ Ignore column order in composite indexes
- ❌ Use leading wildcards in LIKE with regular indexes
- ❌ Create indexes without understanding query patterns
- ❌ Forget to index foreign keys
- ❌ Ignore index maintenance
- ❌ Create duplicate or redundant indexes
- ❌ Use expressions on indexed columns in WHERE without functional indexes

## Performance Trade-offs

### Index Cost
```sql
-- Each index has costs:
-- 1. Storage space (typically 10-30% of table size)
-- 2. Write performance (INSERT, UPDATE, DELETE become slower)
-- 3. Maintenance overhead (statistics, rebuilding)

-- Example: Table with 10 indexes
-- INSERT: ~10-50% slower than table with 0 indexes
-- UPDATE: ~10-30% slower if indexed column updated
-- DELETE: ~10-30% slower

-- Balance read vs write performance
-- Read-heavy: More indexes OK
-- Write-heavy: Fewer indexes
```

### Index Selectivity

**High selectivity = Good index candidate:**
```sql
-- Email: High selectivity (nearly unique)
-- Ratio of distinct values / total rows ≈ 1.0
-- ✅ Good index candidate

-- Status: Low selectivity (few distinct values)
-- Ratio might be 0.01 (3 values: pending, completed, cancelled)
-- ❌ Poor index candidate alone
-- ✅ Better as part of composite index

-- Check selectivity
SELECT
    COUNT(DISTINCT column_name) * 1.0 / COUNT(*) as selectivity
FROM table_name;

-- Rule of thumb:
-- > 0.95: Excellent
-- 0.1 - 0.95: Good
-- < 0.1: Consider composite index or skip
```

## Common Indexing Mistakes

### 1. Join Column Order
```sql
-- Query
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.email = 'user@example.com';

-- Wrong: Index on orders.user_id (not enough)
-- Better: Index on users.email (filter first)
```

### 2. Too Many Indexes
```sql
-- 10 indexes on frequently updated table
-- Each INSERT/UPDATE/DELETE must update all 10 indexes
-- Consider removing rarely used indexes
```

### 3. Wrong Column Order
```sql
-- Query always filters by user_id
CREATE INDEX idx ON orders(created_at, user_id);  -- Wrong

-- Correct
CREATE INDEX idx ON orders(user_id, created_at);
```

### 4. Ignoring Covering Indexes
```sql
-- Query fetches 3 columns
SELECT user_id, status, total FROM orders WHERE user_id = 123;

-- Regular index requires table lookup
CREATE INDEX idx ON orders(user_id);

-- Covering index avoids table lookup
CREATE INDEX idx ON orders(user_id, status, total);  -- Or INCLUDE
```

## Checklist

### Before Creating Indexes:
- [ ] Identify slow queries
- [ ] Analyze WHERE, JOIN, ORDER BY, GROUP BY clauses
- [ ] Check existing indexes
- [ ] Consider selectivity of columns
- [ ] Estimate read vs write ratio
- [ ] Calculate storage requirements

### After Creating Indexes:
- [ ] Run EXPLAIN to verify index usage
- [ ] Measure query performance improvement
- [ ] Monitor write performance impact
- [ ] Update table statistics
- [ ] Document index purpose
- [ ] Set up monitoring for index usage

### Ongoing Maintenance:
- [ ] Monitor for unused indexes
- [ ] Check index fragmentation
- [ ] Update statistics regularly
- [ ] Rebuild/reorganize as needed
- [ ] Review index strategy periodically
- [ ] Remove obsolete indexes
