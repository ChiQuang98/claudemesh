---
name: data-cleaning
description: Python data cleaning patterns and best practices using Pandas. Use when cleaning messy data, handling missing values, or standardizing datasets.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Data Cleaning with Pandas

## Overview

Data cleaning is the process of preparing raw data for analysis by handling missing values, fixing data types, removing duplicates, and standardizing formats. This skill covers common patterns and best practices.

## Data Quality Assessment

### Initial Inspection

```python
import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('data.csv')

# Basic info
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")
print(f"Data types:\n{df.dtypes}")

# First look
df.head()
df.tail()
df.sample(10)

# Statistical summary
df.describe()
df.describe(include='all')  # Include non-numeric

# Memory usage
df.info(memory_usage='deep')
```

### Missing Value Analysis

```python
# Count missing values
df.isnull().sum()

# Percentage missing
(df.isnull().sum() / len(df) * 100).round(2)

# Visualize missing patterns
import missingno as msno
msno.matrix(df)
msno.heatmap(df)

# Detailed missing report
def missing_report(df):
    missing = df.isnull().sum()
    percent = (missing / len(df) * 100).round(2)
    types = df.dtypes

    report = pd.DataFrame({
        'Missing': missing,
        'Percent': percent,
        'Type': types
    })
    return report[report['Missing'] > 0].sort_values('Percent', ascending=False)

missing_report(df)
```

### Duplicate Analysis

```python
# Check for duplicates
df.duplicated().sum()

# View duplicates
df[df.duplicated(keep=False)]

# Duplicates by subset
df.duplicated(subset=['id', 'date']).sum()

# Detailed duplicate report
def duplicate_report(df, columns=None):
    if columns:
        dups = df[df.duplicated(subset=columns, keep=False)]
    else:
        dups = df[df.duplicated(keep=False)]
    return f"Duplicates: {len(dups)} ({len(dups)/len(df)*100:.2f}%)"
```

## Handling Missing Values

### Drop Missing Values

```python
# Drop rows with any missing
df_clean = df.dropna()

# Drop rows where specific columns are missing
df_clean = df.dropna(subset=['important_col1', 'important_col2'])

# Keep rows with at least N non-null values
df_clean = df.dropna(thresh=5)

# Drop columns with too many missing values
threshold = 0.5  # 50%
cols_to_drop = df.columns[df.isnull().mean() > threshold]
df_clean = df.drop(columns=cols_to_drop)
```

### Fill Missing Values

```python
# Fill with constant
df['column'] = df['column'].fillna(0)
df['column'] = df['column'].fillna('Unknown')

# Fill with statistics
df['numeric'] = df['numeric'].fillna(df['numeric'].mean())
df['numeric'] = df['numeric'].fillna(df['numeric'].median())
df['category'] = df['category'].fillna(df['category'].mode()[0])

# Forward/backward fill (time series)
df['value'] = df['value'].fillna(method='ffill')  # Forward fill
df['value'] = df['value'].fillna(method='bfill')  # Backward fill
df['value'] = df['value'].fillna(method='ffill').fillna(method='bfill')

# Interpolation
df['value'] = df['value'].interpolate()  # Linear
df['value'] = df['value'].interpolate(method='time')  # Time-based
df['value'] = df['value'].interpolate(method='polynomial', order=2)

# Group-based filling
df['value'] = df.groupby('category')['value'].transform(
    lambda x: x.fillna(x.mean())
)
```

### Advanced Imputation

```python
from sklearn.impute import SimpleImputer, KNNImputer

# Simple imputation
imputer = SimpleImputer(strategy='mean')  # or 'median', 'most_frequent'
df[numeric_cols] = imputer.fit_transform(df[numeric_cols])

# KNN imputation (considers relationships between columns)
knn_imputer = KNNImputer(n_neighbors=5)
df[numeric_cols] = knn_imputer.fit_transform(df[numeric_cols])

# Indicator for missing values
df['column_was_missing'] = df['column'].isnull().astype(int)
```

## Handling Duplicates

### Remove Duplicates

```python
# Remove exact duplicates
df_clean = df.drop_duplicates()

# Remove duplicates by subset (keep first)
df_clean = df.drop_duplicates(subset=['id'], keep='first')

# Remove duplicates (keep last)
df_clean = df.drop_duplicates(subset=['id', 'date'], keep='last')

# Remove all duplicates (keep none)
df_clean = df.drop_duplicates(subset=['id'], keep=False)
```

### Handle Duplicates with Aggregation

```python
# Aggregate duplicates
df_agg = df.groupby(['id', 'date']).agg({
    'value': 'sum',
    'count': 'sum',
    'category': 'first'
}).reset_index()

# Keep most recent
df_latest = df.sort_values('timestamp').drop_duplicates(
    subset=['id'],
    keep='last'
)
```

## Data Type Conversion

### Numeric Conversion

```python
# String to numeric
df['price'] = pd.to_numeric(df['price'], errors='coerce')  # Invalid → NaN

# Clean before converting
df['price'] = df['price'].str.replace('$', '').str.replace(',', '')
df['price'] = pd.to_numeric(df['price'])

# Downcast for memory efficiency
df['int_col'] = pd.to_numeric(df['int_col'], downcast='integer')
df['float_col'] = pd.to_numeric(df['float_col'], downcast='float')
```

### Date/Time Conversion

```python
# String to datetime
df['date'] = pd.to_datetime(df['date'])
df['date'] = pd.to_datetime(df['date'], format='%Y-%m-%d')
df['date'] = pd.to_datetime(df['date'], errors='coerce')  # Invalid → NaT

# Common date formats
formats = {
    '2024-01-15': '%Y-%m-%d',
    '01/15/2024': '%m/%d/%Y',
    '15-Jan-2024': '%d-%b-%Y',
    '2024-01-15 10:30:00': '%Y-%m-%d %H:%M:%S'
}

# Extract date components
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day'] = df['date'].dt.day
df['day_of_week'] = df['date'].dt.dayofweek
df['quarter'] = df['date'].dt.quarter
```

### Categorical Conversion

```python
# Convert to category (memory efficient)
df['category'] = df['category'].astype('category')

# Ordered categories
from pandas.api.types import CategoricalDtype
size_type = CategoricalDtype(categories=['S', 'M', 'L', 'XL'], ordered=True)
df['size'] = df['size'].astype(size_type)

# One-hot encoding
df_encoded = pd.get_dummies(df, columns=['category'])

# Label encoding
df['category_code'] = df['category'].cat.codes
```

## String Cleaning

### Basic String Operations

```python
# Lowercase/uppercase
df['text'] = df['text'].str.lower()
df['text'] = df['text'].str.upper()
df['text'] = df['text'].str.title()

# Strip whitespace
df['text'] = df['text'].str.strip()
df['text'] = df['text'].str.lstrip()
df['text'] = df['text'].str.rstrip()

# Replace
df['text'] = df['text'].str.replace('old', 'new')
df['text'] = df['text'].str.replace(r'\s+', ' ', regex=True)  # Multiple spaces

# Remove special characters
df['text'] = df['text'].str.replace(r'[^\w\s]', '', regex=True)
```

### Pattern Extraction

```python
# Extract patterns
df['phone'] = df['text'].str.extract(r'(\d{3}-\d{3}-\d{4})')
df['email'] = df['text'].str.extract(r'([\w.]+@[\w.]+)')

# Split strings
df[['first', 'last']] = df['name'].str.split(' ', n=1, expand=True)
df['domain'] = df['email'].str.split('@').str[1]

# Check patterns
df['has_number'] = df['text'].str.contains(r'\d', regex=True)
df['is_email'] = df['text'].str.match(r'^[\w.]+@[\w.]+$')
```

### Standardize Text

```python
# Standardize categories
mapping = {
    'ny': 'New York',
    'NYC': 'New York',
    'new york': 'New York',
    'ca': 'California',
    'CA': 'California'
}
df['state'] = df['state'].replace(mapping)

# Fuzzy matching for typos
from fuzzywuzzy import process

def standardize(value, choices, threshold=80):
    match, score = process.extractOne(value, choices)
    return match if score >= threshold else value

standard_values = ['New York', 'California', 'Texas']
df['state'] = df['state'].apply(lambda x: standardize(x, standard_values))
```

## Outlier Handling

### Detect Outliers

```python
# IQR method
Q1 = df['value'].quantile(0.25)
Q3 = df['value'].quantile(0.75)
IQR = Q3 - Q1
lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

outliers = df[(df['value'] < lower_bound) | (df['value'] > upper_bound)]

# Z-score method
from scipy import stats
z_scores = np.abs(stats.zscore(df['value']))
outliers = df[z_scores > 3]

# Percentile method
lower = df['value'].quantile(0.01)
upper = df['value'].quantile(0.99)
outliers = df[(df['value'] < lower) | (df['value'] > upper)]
```

### Handle Outliers

```python
# Remove outliers
df_clean = df[(df['value'] >= lower_bound) & (df['value'] <= upper_bound)]

# Cap outliers (winsorization)
df['value'] = df['value'].clip(lower=lower_bound, upper=upper_bound)

# Replace with NaN
df.loc[df['value'] > upper_bound, 'value'] = np.nan

# Log transformation (reduce impact)
df['value_log'] = np.log1p(df['value'])
```

## Data Validation

### Range Validation

```python
# Check valid ranges
assert df['age'].between(0, 120).all(), "Invalid age values"
assert df['percentage'].between(0, 100).all(), "Invalid percentage"

# Flag invalid values
df['valid_age'] = df['age'].between(0, 120)
df['valid_price'] = df['price'] >= 0

# Fix invalid values
df.loc[df['age'] < 0, 'age'] = np.nan
df.loc[df['age'] > 120, 'age'] = np.nan
```

### Consistency Validation

```python
# Check referential integrity
valid_categories = ['A', 'B', 'C']
assert df['category'].isin(valid_categories).all()

# Cross-field validation
assert (df['end_date'] >= df['start_date']).all(), "End date before start"

# Check calculated fields
assert np.allclose(df['total'], df['subtotal'] + df['tax'])
```

### Schema Validation

```python
import pandera as pa

# Define schema
schema = pa.DataFrameSchema({
    'id': pa.Column(int, nullable=False, unique=True),
    'name': pa.Column(str, nullable=False),
    'age': pa.Column(int, pa.Check.in_range(0, 120), nullable=True),
    'email': pa.Column(str, pa.Check.str_matches(r'^[\w.]+@[\w.]+$')),
    'created_at': pa.Column(pa.DateTime, nullable=False)
})

# Validate
validated_df = schema.validate(df)
```

## Complete Cleaning Pipeline

```python
def clean_data(df):
    """Complete data cleaning pipeline."""
    df = df.copy()

    # 1. Standardize column names
    df.columns = df.columns.str.lower().str.replace(' ', '_')

    # 2. Remove duplicates
    df = df.drop_duplicates()

    # 3. Handle missing values
    # Drop rows with critical columns missing
    df = df.dropna(subset=['id', 'date'])

    # Fill numeric with median
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    # Fill categorical with mode
    cat_cols = df.select_dtypes(include=['object']).columns
    for col in cat_cols:
        df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else 'Unknown')

    # 4. Fix data types
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df['price'] = pd.to_numeric(df['price'], errors='coerce')

    # 5. Clean strings
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].str.strip()

    # 6. Handle outliers (cap at 1st and 99th percentile)
    for col in numeric_cols:
        lower = df[col].quantile(0.01)
        upper = df[col].quantile(0.99)
        df[col] = df[col].clip(lower=lower, upper=upper)

    # 7. Validate
    assert df['id'].notna().all(), "ID contains null values"
    assert (df['price'] >= 0).all(), "Negative prices found"

    return df

# Apply pipeline
df_clean = clean_data(df)
```

## Best Practices Checklist

### Before Cleaning
- [ ] Understand the data source and context
- [ ] Document original data quality issues
- [ ] Create data dictionary
- [ ] Make a copy of original data

### During Cleaning
- [ ] Check data types before and after
- [ ] Validate transformations with samples
- [ ] Keep track of rows removed
- [ ] Document assumptions made

### After Cleaning
- [ ] Verify row counts
- [ ] Check for introduced NaN values
- [ ] Validate against business rules
- [ ] Compare statistics before/after

## References

- Pandas Documentation: https://pandas.pydata.org/docs/
- Data Cleaning Best Practices: https://www.kaggle.com/learn/data-cleaning
- Pandera Validation: https://pandera.readthedocs.io/
