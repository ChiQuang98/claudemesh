---
name: dbt
description: dbt (data build tool) transformations and SQL workflows. Use when building data transformations, data models, or orchestrating SQL workflows.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# dbt (data build tool)

## Overview
dbt is a transformation tool that enables data analysts and engineers to transform, test, and document data in the warehouse using SQL.

## Project Structure

```
dbt_project/
├── dbt_project.yml          # Project configuration
├── profiles.yml              # Database connection profiles
├── models/
│   ├── staging/             # Raw data staging
│   │   ├── stg_orders.sql
│   │   ├── stg_orders.yml
│   │   ├── stg_customers.sql
│   │   └── stg_customers.yml
│   ├── intermediate/        # Intermediate transformations
│   │   ├── int_customer_orders.sql
│   │   └── int_customer_orders.yml
│   ├── marts/               # Business logic
│   │   ├── finance/
│   │   │   ├── fact_orders.sql
│   │   │   └── fact_orders.yml
│   │   └── marketing/
│   │       ├── dim_campaigns.sql
│   │       └── dim_campaigns.yml
│   └── utils/               # Utility macros
├── tests/                   # Data tests
├── seeds/                   # Static data
├── snapshots/               # Slowly changing dimensions
├── analyses/                # Ad-hoc analysis
├── macros/                  # Reusable SQL snippets
├── docs/                    # Documentation
└── data/                    # Test data
```

## File Naming Convention

**Best Practice: Each model should have one YAML file with the same name**

For every `.sql` model file, create a corresponding `.yml` file with the same base name:

```
models/staging/stg_orders.sql       # SQL model
models/staging/stg_orders.yml      # Metadata, tests, documentation

models/marts/fact_orders.sql      # SQL model
models/marts/fact_orders.yml     # Metadata, tests, documentation
```

This approach provides:
- **Better organization**: Easy to find metadata for a specific model
- **Clear ownership**: Each model has its own documentation
- **Easier merging**: Less conflict in version control
- **Scalability**: Simple to add new models without bloating single files

### YAML File Template

Use this template for every model YAML file:

```yaml
# models/[directory]/[model_name].yml
version: 2

description: |
  Brief description of what this model does and why it exists.
  Include business purpose, grain, and update frequency.

columns:
  - name: column_name
    description: "Clear description of what this column contains"
    data_type: [data type - for documentation only]

  - name: important_column
    description: "Description"
    data_type: [data type]
    tests:
      - [test names - only for critical columns]

  - name: optional_column
    description: "Description"
    data_type: [data type]

tests:
  - [model-level tests - if needed]
```

### Testing Guidelines

**Only add tests where they provide value:**

✅ **Test these columns:**
- Primary keys and unique identifiers
- Foreign keys (use relationships test)
- Critical business fields (amounts, quantities, status)
- Required fields (not_null)
- Fields with specific constraints (value ranges, allowed values)

❌ **Don't test these columns:**
- Descriptive fields (names, addresses, text)
- Optional fields where NULL is valid
- Derived/calculated columns already tested elsewhere
- Low-cardinality dimensions used only for grouping
- Timestamp columns that are always populated

### Quick Reference: Data Type Fields

Common `data_type` values for documentation:
- `integer` or `bigint`: Whole numbers
- `decimal(precision, scale)`: Fixed-point numbers (e.g., `decimal(18,2)`)
- `varchar(n)`: Variable-length strings
- `text`: Large text blocks
- `date`: Calendar date (no time)
- `timestamp`: Date and time
- `boolean`: True/false values
- `array`: Array of values
- `json` or `jsonb`: JSON data

**Note**: The `data_type` field is for documentation purposes only.
dbt does not enforce these types - they help users understand the expected data.

## dbt_project.yml Configuration

```yaml
name: 'my_project'
version: '1.0.0'
config-version: 2

profile: 'my_profile'

model-paths: ["models"]
seed-paths: ["seeds"]
test-paths: ["tests"]
analysis-paths: ["analyses"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  my_project:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      finance:
        +schema: finance
      marketing:
        +schema: marketing

tests:
  +schema: dbt_test__audit
```

## Models

### Staging Models
```sql
-- models/staging/stg_orders.sql
{{
  config(
    materialized = 'view',
    tags = ['staging']
  )
}}

WITH source AS (
    SELECT * FROM {{ source('raw', 'orders') }}
),

renamed AS (
    SELECT
        id AS order_id,
        user_id AS customer_id,
        order_date,
        status,
        amount
    FROM source
)

SELECT * FROM renamed
```

### Intermediate Models
```sql
-- models/intermediate/int_customer_orders.sql
{{
  config(
    materialized = 'ephemeral'  # CTE, no table created
  )
}}

WITH customer_orders AS (
    SELECT
        customer_id,
        COUNT(*) AS order_count,
        SUM(amount) AS total_spent,
        MIN(order_date) AS first_order,
        MAX(order_date) AS last_order
    FROM {{ ref('stg_orders') }}
    GROUP BY customer_id
)

SELECT * FROM customer_orders
```

### Mart Models (Fact Tables)
```sql
-- models/marts/fact_orders.sql
{{
  config(
    materialized = 'table',
    tags = ['marts', 'finance']
  )
}}

WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),

enriched AS (
    SELECT
        o.order_id,
        o.customer_id,
        c.customer_name,
        c.segment,
        o.order_date,
        o.amount,
        ROW_NUMBER() OVER (
            PARTITION BY o.customer_id
            ORDER BY o.order_date
        ) AS order_number
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
)

SELECT * FROM enriched
```

## Sources and Snapshots

### Defining Sources
```yaml
# models/staging/sources.yml
version: 2

sources:
  - name: raw
    schema: raw_data
    tables:
      - name: orders
        description: "Raw orders from production database"
        columns:
          - name: id
            description: "Primary key"
            tests:
              - unique
              - not_null
          - name: order_date
            description: "Order timestamp"
            tests:
              - dbt_expectations.expect_row_values_to_have_recent_data:
                  datepart: day
                  field: order_date
                  interval: 1
      - name: customers
        description: "Raw customers from production database"
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
        loaded_at_field: updated_at
```

### Snapshots (SCD Type 2)
```sql
-- snapshots/snap_customers.sql
{{
  config(
    target_schema = 'snapshots',
    unique_key = 'customer_id',
    strategy = 'timestamp',
    updated_at = 'updated_at',
  )
}}

SELECT
    customer_id,
    customer_name,
    email,
    segment,
    updated_at
FROM {{ source('raw', 'customers') }}
```

## Model Documentation and Testing

### Per-Model YAML Files (Best Practice)

Each model should have its own YAML file with the same name containing:
- Model description
- Column definitions with data types
- Column descriptions
- Tests

#### Staging Model Example

**models/staging/stg_orders.sql**
```sql
{{
  config(
    materialized = 'view',
    tags = ['staging']
  )
}}

WITH source AS (
    SELECT * FROM {{ source('raw', 'orders') }}
),

renamed AS (
    SELECT
        id AS order_id,
        user_id AS customer_id,
        order_date,
        status,
        amount
    FROM source
)

SELECT * FROM renamed
```

**models/staging/stg_orders.yml**
```yaml
version: 2

description: |
  Staging model for orders data. Cleans and renames columns from the raw
  source table. Orders represent transactional events from the e-commerce system.

columns:
  - name: order_id
    description: "Unique identifier for each order"
    data_type: integer
    tests:
      - unique
      - not_null

  - name: customer_id
    description: "Foreign key reference to the customer who placed the order"
    data_type: integer
    tests:
      - not_null
      - relationships:
          to: ref('stg_customers')
          field: customer_id

  - name: order_date
    description: "Timestamp when the order was placed"
    data_type: timestamp
    tests:
      - not_null

  - name: status
    description: "Current order status (placed, shipped, delivered, cancelled)"
    data_type: varchar

  - name: amount
    description: "Total order amount in USD"
    data_type: decimal(18,2)
    tests:
      - not_null
      - dbt_expectations.expect_column_values_to_be_between:
          min_value: 0
          max_value: 1000000
```

#### Intermediate Model Example

**models/intermediate/int_customer_orders.sql**
```sql
{{
  config(
    materialized = 'ephemeral'
  )
}}

WITH customer_orders AS (
    SELECT
        customer_id,
        COUNT(*) AS order_count,
        SUM(amount) AS total_spent,
        MIN(order_date) AS first_order,
        MAX(order_date) AS last_order
    FROM {{ ref('stg_orders') }}
    GROUP BY customer_id
)

SELECT * FROM customer_orders
```

**models/intermediate/int_customer_orders.yml**
```yaml
version: 2

description: |
  Intermediate model that aggregates order data at the customer level.
  Used as a CTE in downstream models. Not materialized in the database.

columns:
  - name: customer_id
    description: "Unique customer identifier"
    data_type: integer
    tests:
      - unique
      - not_null

  - name: order_count
    description: "Total number of orders placed by the customer"
    data_type: bigint

  - name: total_spent
    description: "Sum of all order amounts for the customer"
    data_type: decimal(18,2)
    tests:
      - not_null

  - name: first_order
    description: "Date of the customer's first order"
    data_type: date

  - name: last_order
    description: "Date of the customer's most recent order"
    data_type: date
```

#### Mart Model Example (Fact Table)

**models/marts/finance/fact_orders.sql**
```sql
{{
  config(
    materialized = 'table',
    tags = ['marts', 'finance']
  )
}}

WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),

enriched AS (
    SELECT
        o.order_id,
        o.customer_id,
        c.customer_name,
        c.segment,
        o.order_date,
        o.amount,
        ROW_NUMBER() OVER (
            PARTITION BY o.customer_id
            ORDER BY o.order_date
        ) AS order_number
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
)

SELECT * FROM enriched
```

**models/marts/finance/fact_orders.yml**
```yaml
version: 2

description: |
  Fact table containing all orders with customer details. This is the central
  table for order analytics and reporting in the finance domain.

  Grain: One row per order
  Update frequency: Daily
  Retention: Indefinite

columns:
  - name: order_id
    description: "Unique identifier for each order"
    data_type: integer
    tests:
      - unique
      - not_null

  - name: customer_id
    description: "Foreign key to customer dimension"
    data_type: integer
    tests:
      - not_null
      - relationships:
          to: ref('stg_customers')
          field: customer_id

  - name: customer_name
    description: "Full name of the customer"
    data_type: varchar

  - name: segment
    description: "Customer segment (consumer, corporate, government)"
    data_type: varchar

  - name: order_date
    description: "Date when the order was placed"
    data_type: date
    tests:
      - not_null

  - name: amount
    description: "Total order amount in USD"
    data_type: decimal(18,2)
    tests:
      - not_null

  - name: order_number
    description: "Sequential order number for the customer (1 = first order)"
    data_type: integer
```

#### Dimension Model Example

**models/marts/marketing/dim_campaigns.sql**
```sql
{{
  config(
    materialized = 'table',
    tags = ['marts', 'marketing']
  )
}}

WITH campaigns AS (
    SELECT
        campaign_id,
        campaign_name,
        campaign_type,
        channel,
        start_date,
        end_date,
        budget
    FROM {{ source('marketing', 'campaigns') }}
)

SELECT * FROM campaigns
```

**models/marts/marketing/dim_campaigns.yml**
```yaml
version: 2

description: |
  Dimension table for marketing campaigns. Contains descriptive attributes
  about campaigns used for analytics and reporting.

  Grain: One row per campaign
  Update frequency: Daily
  SCD Type: 2 (history tracked via snapshots)

columns:
  - name: campaign_id
    description: "Unique identifier for the campaign"
    data_type: integer
    tests:
      - unique
      - not_null

  - name: campaign_name
    description: "Human-readable name of the campaign"
    data_type: varchar
    tests:
      - not_null

  - name: campaign_type
    description: "Type of campaign (awareness, consideration, conversion, retention)"
    data_type: varchar

  - name: channel
    description: "Marketing channel (email, social, search, display, etc.)"
    data_type: varchar

  - name: start_date
    description: "Campaign start date"
    data_type: date
    tests:
      - not_null

  - name: end_date
    description: "Campaign end date (null if ongoing)"
    data_type: date

  - name: budget
    description: "Total campaign budget in USD"
    data_type: decimal(18,2)
    tests:
      - not_null
      - dbt_expectations.expect_column_values_to_be_between:
          min_value: 0
```

### Data Tests
```sql
-- tests/assert_positive_amounts.sql
SELECT *
FROM {{ ref('fact_orders') }}
WHERE amount <= 0

-- tests/assert_future_orders.sql
SELECT *
FROM {{ ref('fact_orders') }}
WHERE order_date > CURRENT_DATE
```

### Custom Generic Tests
```sql
-- macros/tests/expect_column_values_to_be_unique.sql
{% test expect_column_values_to_be_unique(model, column_name) %}

WITH validation_errors AS (
    SELECT
        {{ column_name }},
        COUNT(*) as count
    FROM {{ model }}
    GROUP BY {{ column_name }}
    HAVING COUNT(*) > 1
)

SELECT *
FROM validation_errors

{% endtest %}

-- Usage in schema.yml
models:
  - name: stg_customers
    columns:
      - name: customer_id
        tests:
          - expect_column_values_to_be_unique
```

## Macros

### Reusable SQL Snippets
```sql
-- macros/pivot.sql
{% macro pivot(values_col, pivots_col) %}

    {% for pivot in pivots_col %}
      SUM(CASE WHEN {{ pivots_col }} = '{{ pivot }}' THEN {{ values_col }} ELSE 0 END) AS {{ pivot }}
      {% if not loop.last %},{% endif %}
    {% endfor %}

{% endmacro %}

-- Usage in model
SELECT
    customer_id,
    {{ pivot('amount', ['online', 'in_store', 'mobile']) }}
FROM {{ ref('orders') }}
GROUP BY customer_id
```

### Conditional Logic
```sql
-- macros/get_partition_suffix.sql
{% macro get_partition_suffix(partition_date) %}
    {% set suffix = partition_date.replace('-', '') %}
    {{ suffix }}
{% endmacro %}

-- macros/deduplicate.sql
{% macro deduplicate(source_table, partition_column, partition_value) %}

    {{ adapter.dispatch('deduplicate', 'dbt')(
        source_table, partition_column, partition_value
    ) }}

{% endmacro %}

{% macro default__deduplicate(source_table, partition_column, partition_value) %}

    WITH ranked AS (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY id
                ORDER BY updated_at DESC
            ) as _rank
        FROM {{ source_table }}
        WHERE {{ partition_column }} = '{{ partition_value }}'
    )

    SELECT * FROM ranked WHERE _rank = 1

{% endmacro %}
```

## Seeds and Static Data

```sql
-- seeds/country_codes.csv
country_code,country_name
US,United States
CA,Canada
GB,United Kingdom
```

```bash
# Run seed
dbt seed --select country_codes
```

## Packages

### dbt_packages.yml
```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.0.0
  - package: calogica/dbt_expectations
    version: 0.9.0
  - package: dbt-labs/codegen
    version: 0.7.0
```

### Using Packages
```sql
-- dbt_utils package
{{ dbt_utils.surrogate_key(['customer_id', 'order_date']) }}
{{ dbt_utils.get_column_values(ref('table'), 'column') }}

-- dbt_expectations
{{ dbt_expectations.expect_column_values_to_be_in_set(
    ref('table'),
    'column',
    values=['A', 'B', 'C']
) }}
```

## Hooks and Operations

### On-run-start/end Hooks
```yaml
# dbt_project.yml
on-run-start:
  - "{{ create_audit_table() }}"

on-run-end:
  - "{{ store_results('target/run_results.json') }}"
  - "{{ notify_slack('dbt run complete') }}"
```

### Custom Hooks
```sql
-- macros/create_audit_table.sql
{% macro create_audit_table() %}
    {% if target.name == 'production' %}
        {% do log('Creating audit table', info=True) %}
        CREATE TABLE IF NOT EXISTS audit_log (
            run_id TEXT,
            run_timestamp TIMESTAMP,
            run_status TEXT
        );
    {% endif %}
{% endmacro %}
```

## Documentation

### Documentation Best Practices

With per-model YAML files, documentation is co-located with the model:

1. **Model-level description**: Top-level `description` field in the YAML
2. **Column descriptions**: Each column has a `description` field
3. **Data types**: Each column has a `data_type` field for documentation
4. **Additional metadata**: Use custom properties for domain-specific info

#### Model Documentation Example

**models/marts/finance/fact_revenue.yml**
```yaml
version: 2

description: |
  Fact table tracking revenue metrics across all business channels.

  **Business Purpose:**
  - Primary source for financial reporting and revenue analytics
  - Supports executive dashboards and P&L statements
  - Used for revenue recognition and forecasting

  **Grain:** One row per transaction per day

  **Update Frequency:** Daily, with 7-day lookback for corrections

  **Retention:** 5 years (compliance requirement)

  **Data Quality:**
  - All amounts are in USD
  - Refunds are stored as negative amounts
  - Adjustments are tagged with adjustment_type

  **Related Models:**
  - Upstream: stg_transactions, stg_refunds
  - Downstream: mart_monthly_revenue, mart_executive_dashboard

columns:
  - name: revenue_id
    description: "Unique identifier for each revenue record"
    data_type: bigint
    tests:
      - unique
      - not_null

  - name: transaction_date
    description: "Date when the transaction occurred"
    data_type: date
    tests:
      - not_null

  - name: channel
    description: "Sales channel (online, retail, marketplace, b2b)"
    data_type: varchar

  - name: product_category
    description: "High-level product category"
    data_type: varchar

  - name: gross_revenue
    description: "Total revenue before any deductions or returns"
    data_type: decimal(18,2)
    tests:
      - not_null

  - name: returns_amount
    description: "Value of returned goods (stored as negative)"
    data_type: decimal(18,2)

  - name: discounts_amount
    description: "Total discounts applied to the transaction"
    data_type: decimal(18,2)

  - name: net_revenue
    description: "Final revenue amount (gross - returns - discounts)"
    data_type: decimal(18,2)
    tests:
      - not_null

  - name: currency_code
    description: "ISO 4217 currency code (all converted to USD)"
    data_type: varchar(3)

  - name: region
    description: "Geographic region for reporting purposes"
    data_type: varchar

meta:
  owner: "finance-team@company.com"
  sla: "Available by 8 AM ET daily"
  pii: false
  classification: "confidential"
```

#### Using Doc Blocks

For reusable documentation blocks:

**models/docs.md**
```yaml
# Documentation blocks that can be referenced across models

docs:
  - name: usd_currency_note
    description: |
      All monetary values are stored in USD. Currency conversion happens
      in the staging layer using daily exchange rates from the Federal Reserve.

  - name: customer_tier_definition
    description: |
      Customer tiers are calculated based on lifetime value:
      - Bronze: $0 - $1,000
      - Silver: $1,001 - $10,000
      - Gold: $10,001 - $50,000
      - Platinum: $50,001+

  - name: order_status_definition
    description: |
      Order status workflow:
      1. placed → Order created
      2. processing → Payment confirmed, preparing for shipment
      3. shipped → Item(s) shipped
      4. delivered → Item(s) delivered to customer
      5. cancelled → Order cancelled (cannot be resumed)
```

**Referencing docs in models:**
```yaml
# models/staging/stg_orders.yml
version: 2

description: "Staging model for orders data"

columns:
  - name: amount
    description: "{{ doc('usd_currency_note') }}"
    data_type: decimal(18,2)

  - name: status
    description: "{{ doc('order_status_definition') }}"
    data_type: varchar
```

## Incremental Models

```sql
-- models/marts/fact_orders_incremental.sql
{{
  config(
    materialized = 'incremental',
    unique_key = 'order_id',
    incremental_strategy = 'insert_overwrite',
    partition_by = ['order_date'],
    cluster_by = ['customer_id']
  )
}}

WITH orders AS (
    SELECT * FROM {{ source('raw', 'orders') }}

    {% if is_incremental() %}
    WHERE order_date >= (
        SELECT MAX(order_date) FROM {{ this }}
    )
    {% endif %}
)

SELECT * FROM orders
```

## Best Practices

### ✅ DO:
- **Use per-model YAML files**: Each `.sql` model should have a corresponding `.yml` file with the same name
- Organize models into staging/intermediate/marts
- Use source() for raw data references
- Implement comprehensive tests
- Document models and columns with data types
- Use materialization appropriately
- Version control dbt_project.yml
- Use packages to avoid reinventing
- Implement CI/CD for dbt
- Use macros for reusable SQL
- Test before deploying

### ❌ DON'T:
- **Use monolithic schema.yml files**: Instead, use one YAML file per model
- Hard-code environment-specific values
- Create circular dependencies
- Skip testing
- Use SELECT * in production
- Forget to document
- Mix concerns in single model
- Ignore performance
- Skip data quality checks
- Write complex SQL without comments
- Forget to handle incremental logic

## File Organization Checklist

### For Each Model:
- [ ] Create model SQL file (e.g., `stg_orders.sql`)
- [ ] Create matching YAML file (e.g., `stg_orders.yml`)
- [ ] Add model description
- [ ] Document all columns with:
  - [ ] `name`: Column name
  - [ ] `description`: What the column contains
  - [ ] `data_type`: Expected data type
  - [ ] `tests`: **Only for critical columns** (primary keys, foreign keys, required fields, business rules)
- [ ] Add model-level tests if needed
- [ ] Include metadata (owner, SLA, etc.)

### Testing Checklist:
- [ ] Primary keys: unique + not_null
- [ ] Foreign keys: not_null + relationships
- [ ] Required fields: not_null
- [ ] Critical fields: range checks, allowed values
- [ ] Skip testing: Descriptive fields, optional fields, timestamps (usually)

## Common Patterns

### Slowly Changing Dimension (SCD)
```sql
-- snapshots/snap_products.sql
{{
  config(
    target_schema = 'snapshots',
    unique_key = 'product_id',
    strategy = 'timestamp',
    updated_at = 'updated_at',
  )
}}

SELECT * FROM {{ ref('stg_products') }}
```

### Customer 360 View
```sql
-- models/marts/customer_360.sql
WITH customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),

orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

order_stats AS (
    SELECT
        customer_id,
        COUNT(*) AS total_orders,
        SUM(amount) AS lifetime_value,
        MAX(order_date) AS last_order_date
    FROM orders
    GROUP BY customer_id
)

SELECT
    c.*,
    COALESCE(o.total_orders, 0) AS total_orders,
    COALESCE(o.lifetime_value, 0) AS lifetime_value,
    o.last_order_date
FROM customers c
LEFT JOIN order_stats o USING (customer_id)
```

### Daily Metrics Rollup
```sql
-- models/marts/fact_daily_metrics.sql
{{
  config(
    materialized = 'incremental',
    unique_key = ['date', 'metric_name']
  )
}}

SELECT
    date,
    'total_orders' AS metric_name,
    COUNT(*) AS metric_value
FROM {{ ref('stg_orders') }}
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date

UNION ALL

SELECT
    date,
    'total_revenue' AS metric_name,
    SUM(amount) AS metric_value
FROM {{ ref('stg_orders') }}
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
```

## CLI Commands

```bash
# Initialize project
dbt init

# Compile SQL (check for errors)
dbt compile

# Run models
dbt run
dbt run --models +fact_orders+  # Run with dependencies
dbt run --select staging          # Run specific package
dbt run --full-refresh           # Rebuild incremental models

# Run tests
dbt test
dbt test --select fact_orders

# Generate documentation
dbt docs generate
dbt docs serve

# Seed data
dbt seed

# Snapshot
dbt snapshot

# Debugging
dbt debug           # Check connection
dbt show            # Show DAG
dbt list            # List resources
```
