---
name: jupyter-patterns
description: Jupyter notebook best practices and patterns. Use when working with notebooks, organizing analysis, or improving notebook workflows.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Jupyter Notebook Best Practices

## Overview

Jupyter notebooks are powerful for data exploration and analysis. This skill covers organization, reproducibility, performance, and collaboration patterns.

## Notebook Structure

### Recommended Layout

```markdown
# Project Title
Brief description of the notebook's purpose.

## Table of Contents
1. Setup & Imports
2. Data Loading
3. Data Exploration
4. Data Cleaning
5. Analysis
6. Visualization
7. Conclusions

---

## 1. Setup & Imports
[All imports and configuration]

## 2. Data Loading
[Load all data sources]

## 3. Data Exploration
[Initial data inspection]

... and so on
```

### Standard Imports Cell

```python
# Standard library
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Data manipulation
import pandas as pd
import numpy as np

# Visualization
import matplotlib.pyplot as plt
import seaborn as sns

# Configuration
pd.set_option('display.max_columns', 50)
pd.set_option('display.max_rows', 100)
pd.set_option('display.float_format', '{:.2f}'.format)

plt.rcParams['figure.figsize'] = (12, 6)
sns.set_theme(style='whitegrid')

# Suppress warnings (optional)
import warnings
warnings.filterwarnings('ignore')

# Auto-reload modules
%load_ext autoreload
%autoreload 2

# Display plots inline
%matplotlib inline

print(f"Python: {sys.version}")
print(f"Pandas: {pd.__version__}")
print(f"NumPy: {np.__version__}")
```

### Configuration Cell

```python
# Project paths
PROJECT_ROOT = Path('.').resolve().parent
DATA_DIR = PROJECT_ROOT / 'data'
OUTPUT_DIR = PROJECT_ROOT / 'output'
MODELS_DIR = PROJECT_ROOT / 'models'

# Create directories if needed
OUTPUT_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# Parameters
RANDOM_SEED = 42
TEST_SIZE = 0.2
DATE_RANGE = ('2024-01-01', '2024-12-31')

# Set random seeds for reproducibility
np.random.seed(RANDOM_SEED)
```

## Cell Organization

### One Task Per Cell

```python
# ❌ Bad: Multiple tasks in one cell
df = pd.read_csv('data.csv')
df = df.dropna()
df['date'] = pd.to_datetime(df['date'])
df = df[df['value'] > 0]
df.plot()

# ✅ Good: Separate cells for each task

# Cell 1: Load data
df = pd.read_csv('data.csv')
df.shape

# Cell 2: Handle missing values
df = df.dropna()
print(f"Rows after dropping NA: {len(df)}")

# Cell 3: Convert date
df['date'] = pd.to_datetime(df['date'])
df.dtypes

# Cell 4: Filter data
df = df[df['value'] > 0]
print(f"Rows after filtering: {len(df)}")

# Cell 5: Visualize
df.plot()
```

### Descriptive Markdown Headers

```markdown
## 3.1 Missing Value Analysis

We'll examine missing values to determine the appropriate handling strategy.
Key questions:
- Which columns have missing values?
- Are they missing at random (MAR) or not at random (MNAR)?
- What imputation strategy should we use?
```

### Output Display Best Practices

```python
# Show both head and tail
display(df.head())
display(df.tail())

# Use display() for DataFrames
display(df)  # Better than just df

# Multiple displays in one cell
from IPython.display import display
display(df1.describe())
display(df2.describe())

# Side-by-side comparison
from IPython.display import HTML
html = f"""
<div style="display: flex;">
    <div style="margin-right: 20px;">
        <h4>Before</h4>
        {df_before.head().to_html()}
    </div>
    <div>
        <h4>After</h4>
        {df_after.head().to_html()}
    </div>
</div>
"""
display(HTML(html))
```

## Reproducibility

### Version Everything

```python
# At the top of every notebook
import sys
import pkg_resources

# Print versions
print(f"Python: {sys.version}")
print(f"Working Directory: {os.getcwd()}")
print(f"Timestamp: {datetime.now()}")

# Key package versions
packages = ['pandas', 'numpy', 'scikit-learn', 'matplotlib']
for package in packages:
    version = pkg_resources.get_distribution(package).version
    print(f"{package}: {version}")
```

### Deterministic Results

```python
# Set all random seeds
import random
import numpy as np

SEED = 42

random.seed(SEED)
np.random.seed(SEED)

# If using TensorFlow
# tf.random.set_seed(SEED)

# If using PyTorch
# torch.manual_seed(SEED)

# For scikit-learn
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=SEED
)
```

### Clear State Before Running

```python
# At the start of notebook
# Restart kernel and run all cells to verify reproducibility

# Or use this cell to clear variables
# %reset -f

# Check for variable leakage
print(f"Variables in namespace: {len(dir())}")
```

## Performance Optimization

### Memory Management

```python
# Check memory usage
df.info(memory_usage='deep')

# Optimize dtypes
def reduce_mem_usage(df):
    """Reduce memory usage of DataFrame."""
    start_mem = df.memory_usage(deep=True).sum() / 1024**2

    for col in df.columns:
        col_type = df[col].dtype

        if col_type != object:
            c_min = df[col].min()
            c_max = df[col].max()

            if str(col_type)[:3] == 'int':
                if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                    df[col] = df[col].astype(np.int8)
                elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                    df[col] = df[col].astype(np.int16)
                elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                    df[col] = df[col].astype(np.int32)
            else:
                if c_min > np.finfo(np.float16).min and c_max < np.finfo(np.float16).max:
                    df[col] = df[col].astype(np.float32)

    end_mem = df.memory_usage(deep=True).sum() / 1024**2
    print(f"Memory: {start_mem:.2f} MB -> {end_mem:.2f} MB ({100 * (start_mem - end_mem) / start_mem:.1f}% reduction)")
    return df

df = reduce_mem_usage(df)
```

### Progress Bars

```python
from tqdm.notebook import tqdm

# For loops
for item in tqdm(items, desc="Processing"):
    process(item)

# For pandas apply
tqdm.pandas(desc="Processing")
df['result'] = df['column'].progress_apply(expensive_function)

# For iterrows
for idx, row in tqdm(df.iterrows(), total=len(df)):
    process(row)
```

### Caching Results

```python
import joblib
from pathlib import Path

# Cache expensive computations
cache_path = Path('cache/processed_data.pkl')

if cache_path.exists():
    print("Loading from cache...")
    df = joblib.load(cache_path)
else:
    print("Processing data...")
    df = expensive_processing(raw_df)
    cache_path.parent.mkdir(exist_ok=True)
    joblib.dump(df, cache_path)

print(f"Shape: {df.shape}")
```

### Timing Cells

```python
%%time
# Time single cell execution
df = expensive_operation(data)

%%timeit
# Benchmark cell (runs multiple times)
result = operation(x)

# Time specific code blocks
from time import time

start = time()
result = operation(data)
print(f"Elapsed: {time() - start:.2f}s")
```

## Visualization Best Practices

### Close Figures

```python
# Prevent memory leaks
fig, ax = plt.subplots()
ax.plot(x, y)
plt.show()
plt.close(fig)

# Or use context manager
with plt.figure() as fig:
    plt.plot(x, y)
    plt.show()
```

### Save and Display

```python
# Save figure programmatically
def save_and_show(fig, filename):
    """Save figure to output directory and display."""
    output_path = OUTPUT_DIR / filename
    fig.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Saved: {output_path}")
    plt.show()

fig, ax = plt.subplots()
ax.plot(x, y)
save_and_show(fig, 'my_plot.png')
```

### Interactive Widgets

```python
from ipywidgets import interact, widgets

@interact(
    column=widgets.Dropdown(options=df.columns, description='Column:'),
    bins=widgets.IntSlider(min=10, max=100, step=10, value=30)
)
def plot_histogram(column, bins):
    fig, ax = plt.subplots()
    df[column].hist(bins=bins, ax=ax)
    ax.set_title(f'Distribution of {column}')
    plt.show()
```

## Debugging

### Variable Inspection

```python
# View all variables
%whos

# View specific types
%whos DataFrame

# Detailed info
%pinfo variable_name

# Source code
%psource function_name
```

### Debugging Cells

```python
# Enable debugger
%debug

# Or use breakpoint
def problematic_function(x):
    breakpoint()  # Drops into debugger
    return x / 0

# Post-mortem debugging
%pdb on
```

### Error Handling in Cells

```python
# Wrap risky operations
try:
    result = risky_operation(data)
    print(f"Success: {result}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
```

## Collaboration

### Document Assumptions

```python
# Document data assumptions
"""
Data Assumptions:
- 'date' column is in YYYY-MM-DD format
- 'value' should be non-negative
- 'category' has values: ['A', 'B', 'C']

Data Quality Issues:
- ~5% missing values in 'value' column
- Duplicate IDs found and removed
"""

# Validate assumptions
assert df['value'].min() >= 0, "Negative values found"
assert df['category'].isin(['A', 'B', 'C']).all(), "Unexpected categories"
```

### Export to Script

```python
# Export notebook to Python script
!jupyter nbconvert --to script notebook.ipynb

# Or use nbdev for literate programming
```

### Clear Output Before Commit

```bash
# Command line: clear all output
jupyter nbconvert --clear-output --inplace notebook.ipynb

# Or use pre-commit hook
```

## Notebook Templates

### Analysis Template

```python
# %% [markdown]
# # Analysis: [Title]
#
# **Author:** [Name]
# **Date:** [Date]
# **Purpose:** [Brief description]

# %% [markdown]
# ## Setup

# %%
# imports and configuration

# %% [markdown]
# ## Data Loading

# %%
# load data

# %% [markdown]
# ## Exploratory Data Analysis

# %%
# EDA code

# %% [markdown]
# ## Analysis

# %%
# main analysis

# %% [markdown]
# ## Conclusions
#
# Key findings:
# 1. Finding 1
# 2. Finding 2
# 3. Finding 3
```

### Model Training Template

```python
# %% [markdown]
# # Model: [Model Name]

# %% [markdown]
# ## 1. Setup

# %%
# imports

# %% [markdown]
# ## 2. Data Preparation

# %%
# data loading and preprocessing

# %% [markdown]
# ## 3. Feature Engineering

# %%
# feature creation

# %% [markdown]
# ## 4. Model Training

# %%
# training code

# %% [markdown]
# ## 5. Evaluation

# %%
# evaluation metrics

# %% [markdown]
# ## 6. Save Model

# %%
# save model and artifacts
```

## Best Practices Checklist

### Before Starting
- [ ] Create a clear notebook structure
- [ ] Set up imports and configuration
- [ ] Document the purpose and scope

### During Development
- [ ] One task per cell
- [ ] Add markdown explanations
- [ ] Use descriptive variable names
- [ ] Display intermediate results
- [ ] Save checkpoints for long-running cells

### Before Sharing
- [ ] Restart kernel and run all
- [ ] Clear unnecessary output
- [ ] Remove debug cells
- [ ] Add conclusions section
- [ ] Document assumptions and limitations

### Version Control
- [ ] Clear output before committing
- [ ] Use meaningful commit messages
- [ ] Consider using jupytext for diffs

## References

- Jupyter Documentation: https://jupyter.org/documentation
- nbdev: https://nbdev.fast.ai/
- Jupytext: https://jupytext.readthedocs.io/
- Google Colab Best Practices: https://colab.research.google.com/
