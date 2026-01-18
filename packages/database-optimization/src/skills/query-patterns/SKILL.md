---
name: query-patterns
description: SQL query patterns and anti-patterns. Use when writing, refactoring, or optimizing SQL queries.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# SQL Query Patterns

## Overview
Essential SQL patterns for writing efficient, maintainable, and performant database queries.

## Fundamental Patterns

### 1. Proper JOIN Patterns

#### Inner Join for Required Relationships
```sql
-- Orders with user information (orders without users are excluded)
SELECT
    o.id,
    o.total,
    u.name,
    u.email
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.status = 'completed';
```

#### Left Join for Optional Relationships
```sql
-- All users, with their orders if they have any
SELECT
    u.id,
    u.name,
    COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

#### Multiple JOINs with Proper Order
```sql
-- Start with smallest table, join to largest
-- Order matters for query optimizer performance
SELECT
    o.id,
    o.total,
    u.name,
    p.name as product_name
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.created_at > '2024-01-01';
```

### 2. Filtering Patterns

#### SARGable Queries (Search ARGument ABLE)
```sql
-- ❌ Bad - Function on column prevents index usage
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';

-- ✅ Good - Range query on indexed column
SELECT * FROM orders
WHERE created_at >= '2024-01-15'
  AND created_at < '2024-01-16';

-- ❌ Bad - Function on indexed column
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- ✅ Good - Use functional index or case-insensitive collation
SELECT * FROM users WHERE email = 'user@example.com';
```

#### IN vs EXISTS
```sql
-- IN for small, known lists
SELECT * FROM products
WHERE category_id IN (1, 5, 12, 23);

-- EXISTS for subqueries (stops at first match)
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
    AND o.total > 1000
);

-- NOT IN (can be slow with NULL values)
SELECT * FROM products
WHERE category_id NOT IN (5, 10, 15);

-- NOT EXISTS (handles NULL correctly)
SELECT * FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM discontinued_products dp
    WHERE dp.product_id = p.id
);
```

### 3. Aggregation Patterns

#### Basic Aggregations
```sql
-- Count with conditions
SELECT
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM orders
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';

-- Percentage calculations
SELECT
    status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orders
GROUP BY status;
```

#### GROUP BY with ROLLUP
```sql
-- Subtotals and grand total
SELECT
    COALESCE(region, 'All Regions') as region,
    COALESCE(category, 'All Categories') as category,
    SUM(sales) as total_sales
FROM sales_data
GROUP BY ROLLUP (region, category);
```

#### GROUP BY with CUBE
```sql
-- All combinations
SELECT
    COALESCE(region, 'All Regions') as region,
    COALESCE(category, 'All Categories') as category,
    COALESCE(year, 'All Years') as year,
    SUM(sales) as total_sales
FROM sales_data
GROUP BY CUBE (region, category, year);
```

### 4. Window Functions

#### Ranking Functions
```sql
-- ROW_NUMBER: Unique ranking
SELECT
    name,
    score,
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank_num
FROM students;

-- RANK: Same scores get same rank, gaps for ties
SELECT
    name,
    score,
    RANK() OVER (ORDER BY score DESC) as rank_position
FROM students;

-- DENSE_RANK: Same scores get same rank, no gaps
SELECT
    name,
    score,
    DENSE_RANK() OVER (ORDER BY score DESC) as dense_rank
FROM students;
```

#### Running Totals and Moving Averages
```sql
-- Running total
SELECT
    date,
    amount,
    SUM(amount) OVER (
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_total
FROM transactions;

-- Moving average (7-day)
SELECT
    date,
    value,
    AVG(value) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7day
FROM metrics;
```

#### First/Last Values
```sql
-- Compare current value to previous
SELECT
    date,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY date) as prev_revenue,
    revenue - LAG(revenue, 1) OVER (ORDER BY date) as change
FROM daily_stats;

-- First and last in group
SELECT
    user_id,
    event_date,
    FIRST_VALUE(event_date) OVER (
        PARTITION BY user_id
        ORDER BY event_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as first_event,
    LAST_VALUE(event_date) OVER (
        PARTITION BY user_id
        ORDER BY event_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as last_event
FROM user_events;
```

### 5. Hierarchical Query Patterns

#### Self-Join for Hierarchies
```sql
-- Find all employees and their managers
SELECT
    e.name as employee,
    e.title,
    m.name as manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

#### Recursive CTE (PostgreSQL, SQL Server)
```sql
-- Find all descendants in a hierarchy
WITH RECURSIVE descendants AS (
    -- Base case: start with specific node
    SELECT id, name, parent_id, 1 as level
    FROM categories
    WHERE id = 5

    UNION ALL

    -- Recursive case: find children
    SELECT c.id, c.name, c.parent_id, d.level + 1
    FROM categories c
    INNER JOIN descendants d ON c.parent_id = d.id
)
SELECT * FROM descendants;
```

### 6. Pivot Patterns

#### Conditional Aggregation (Database-Agnostic)
```sql
-- Pivot months to columns
SELECT
    product_id,
    SUM(CASE WHEN month = 'Jan' THEN sales END) as jan_sales,
    SUM(CASE WHEN month = 'Feb' THEN sales END) as feb_sales,
    SUM(CASE WHEN month = 'Mar' THEN sales END) as mar_sales,
    SUM(CASE WHEN month = 'Apr' THEN sales END) as apr_sales
FROM monthly_sales
GROUP BY product_id;
```

#### FILTER Clause (PostgreSQL)
```sql
-- Cleaner syntax for conditional aggregation
SELECT
    product_id,
    SUM(sales) FILTER (WHERE month = 'Jan') as jan_sales,
    SUM(sales) FILTER (WHERE month = 'Feb') as feb_sales,
    SUM(sales) FILTER (WHERE month = 'Mar') as mar_sales
FROM monthly_sales
GROUP BY product_id;
```

### 7. Upsert Patterns

#### PostgreSQL (ON CONFLICT)
```sql
INSERT INTO users (id, name, email)
VALUES (1, 'John', 'john@example.com')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;
```

#### MySQL (ON DUPLICATE KEY UPDATE)
```sql
INSERT INTO users (id, name, email)
VALUES (1, 'John', 'john@example.com')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    email = VALUES(email),
    updated_at = CURRENT_TIMESTAMP;
```

#### SQL Server (MERGE)
```sql
MERGE INTO users AS target
USING (VALUES (1, 'John', 'john@example.com'))
    AS source (id, name, email)
ON target.id = source.id
WHEN MATCHED THEN
    UPDATE SET name = source.name, email = source.email
WHEN NOT MATCHED THEN
    INSERT (id, name, email) VALUES (source.id, source.name, source.email);
```

### 8. Pagination Patterns

#### Offset-Based (Simple)
```sql
-- Simple but slow for deep pagination
SELECT * FROM products
ORDER BY created_at DESC
LIMIT 20 OFFSET 100;
```

#### Cursor-Based (Efficient)
```sql
-- Fast, consistent pagination
SELECT * FROM products
WHERE id > 12345  -- Cursor from last page
ORDER BY id
LIMIT 20;

-- With multiple columns
SELECT * FROM products
WHERE (created_at, id) > ('2024-01-15', 12345)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### 9. Date/Time Patterns

#### Date Range Queries
```sql
-- ✅ Good - Inclusive start, exclusive end
SELECT *
FROM events
WHERE created_at >= '2024-01-01'
  AND created_at < '2024-02-01';

-- Current period
SELECT *
FROM orders
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

#### Date Arithmetic
```sql
-- PostgreSQL
SELECT
    CURRENT_DATE as today,
    CURRENT_DATE + INTERVAL '7 days' as next_week,
    CURRENT_DATE - INTERVAL '30 days' as last_month,
    DATE_TRUNC('month', CURRENT_DATE) as month_start;

-- MySQL
SELECT
    CURRENT_DATE as today,
    DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) as next_week,
    DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) as last_month,
    DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') as month_start;
```

### 10. Array/JSON Patterns

#### Working with Arrays (PostgreSQL)
```sql
-- Find rows containing value in array
SELECT * FROM posts
WHERE 'javascript' = ANY(tags);

-- Find rows where array contains all values
SELECT * FROM posts
WHERE tags @> ARRAY['javascript', 'nodejs'];

-- Unnest array to rows
SELECT
    post_id,
    UNNEST(tags) as tag
FROM posts;
```

#### JSON Queries (PostgreSQL, MySQL)
```sql
-- Query JSON fields (PostgreSQL)
SELECT *
FROM users
WHERE metadata->>'preferences'->>'theme' = 'dark';

-- Update JSON field
UPDATE users
SET metadata = jsonb_set(metadata, '{preferences,theme}', '"light"')
WHERE id = 1;

-- MySQL JSON
SELECT * FROM users
WHERE JSON_EXTRACT(metadata, '$.preferences.theme') = 'dark';
```

## Anti-Patterns to Avoid

### 1. SELECT *
```sql
-- ❌ Bad - Fetches unnecessary data
SELECT * FROM users WHERE active = true;

-- ✅ Good - Select only needed columns
SELECT id, name, email FROM users WHERE active = true;
```

### 2. N+1 Queries
```sql
-- ❌ Bad - One query + N follow-up queries
-- Application code queries for each order's user

-- ✅ Good - Single query with JOIN
SELECT o.*, u.name, u.email
FROM orders o
INNER JOIN users u ON o.user_id = u.id;
```

### 3. Wildcard Leading LIKE
```sql
-- ❌ Bad - Cannot use index
SELECT * FROM products WHERE name LIKE '%widget%';

-- ✅ Good - Use full-text search
SELECT * FROM products
WHERE to_tsvector(name) @@ to_tsquery('widget');

-- ✅ Or trigram index (PostgreSQL)
SELECT * FROM products WHERE name LIKE '%widget%';
-- CREATE EXTENSION pg_trgm;
-- CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
```

### 4. OR on Different Columns
```sql
-- ❌ Bad - Often prevents efficient index usage
SELECT * FROM users
WHERE email = 'user@example.com' OR username = 'user';

-- ✅ Good - Use UNION
SELECT * FROM users WHERE email = 'user@example.com'
UNION ALL
SELECT * FROM users WHERE username = 'user' AND email != 'user@example.com';
```

## Performance Tips

1. **Index columns used in WHERE, JOIN, ORDER BY, and GROUP BY**
2. **Use EXPLAIN to verify index usage**
3. **Keep transactions short**
4. **Use connection pooling**
5. **Batch operations when possible**
6. **Avoid wrapping indexed columns in functions**
7. **Use appropriate data types**
8. **Consider denormalization for read-heavy workloads**
9. **Monitor slow query logs**
10. **Update table statistics regularly**

## Database-Specific Notes

### PostgreSQL
- Use `ANALYZE` after bulk operations
- Consider `VACUUM` for bloat
- Enable `pg_stat_statements` for query monitoring
- Use `EXPLAIN (ANALYZE, BUFFERS)` for detailed plans

### MySQL
- Use `EXPLAIN FORMAT=JSON` for detailed plans
- Enable slow query log
- Consider Query Cache (deprecated in 8.0+)
- Use `FORCE INDEX` sparingly when optimizer fails

### SQL Server
- Use `SET STATISTICS IO ON` and `SET STATISTICS TIME ON`
- Check execution plans with `SET SHOWPLAN_ALL ON`
- Use Database Tuning Advisor
- Monitor with Query Store
