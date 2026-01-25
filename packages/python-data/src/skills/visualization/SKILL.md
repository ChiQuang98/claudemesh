---
name: visualization
description: Python data visualization patterns using Matplotlib, Seaborn, and Plotly. Use when creating charts, graphs, or visual data representations.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Data Visualization with Python

## Overview

This skill covers data visualization using Matplotlib, Seaborn, and Plotly. Choose the right library for your needs:

- **Matplotlib**: Low-level, full control, publication-quality
- **Seaborn**: Statistical visualizations, beautiful defaults
- **Plotly**: Interactive, web-ready, dashboards

## Setup and Configuration

### Import Libraries

```python
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np

# Seaborn styling
sns.set_theme(style="whitegrid")
sns.set_palette("husl")

# Matplotlib defaults
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = 12
```

## Distribution Visualizations

### Histogram

```python
# Matplotlib
fig, ax = plt.subplots()
ax.hist(df['value'], bins=30, edgecolor='black', alpha=0.7)
ax.set_xlabel('Value')
ax.set_ylabel('Frequency')
ax.set_title('Distribution of Values')
plt.show()

# Seaborn
fig, ax = plt.subplots()
sns.histplot(data=df, x='value', bins=30, kde=True, ax=ax)
ax.set_title('Distribution with KDE')
plt.show()

# Plotly
fig = px.histogram(df, x='value', nbins=30, title='Interactive Histogram')
fig.show()
```

### Box Plot

```python
# Seaborn - single variable
fig, ax = plt.subplots()
sns.boxplot(data=df, y='value', ax=ax)
plt.show()

# Seaborn - by category
fig, ax = plt.subplots(figsize=(12, 6))
sns.boxplot(data=df, x='category', y='value', ax=ax)
ax.set_title('Value Distribution by Category')
plt.xticks(rotation=45)
plt.show()

# Plotly
fig = px.box(df, x='category', y='value', title='Box Plot by Category')
fig.show()
```

### Violin Plot

```python
# Seaborn
fig, ax = plt.subplots(figsize=(12, 6))
sns.violinplot(data=df, x='category', y='value', ax=ax)
ax.set_title('Value Distribution (Violin)')
plt.show()

# Combined violin + strip plot
fig, ax = plt.subplots(figsize=(12, 6))
sns.violinplot(data=df, x='category', y='value', inner=None, ax=ax)
sns.stripplot(data=df, x='category', y='value', color='black', size=3, ax=ax)
plt.show()
```

## Categorical Visualizations

### Bar Chart

```python
# Matplotlib
categories = df['category'].value_counts()
fig, ax = plt.subplots()
ax.bar(categories.index, categories.values)
ax.set_xlabel('Category')
ax.set_ylabel('Count')
ax.set_title('Category Counts')
plt.xticks(rotation=45)
plt.show()

# Seaborn - count plot
fig, ax = plt.subplots()
sns.countplot(data=df, x='category', order=df['category'].value_counts().index, ax=ax)
ax.set_title('Category Distribution')
plt.show()

# Seaborn - with aggregation
fig, ax = plt.subplots()
sns.barplot(data=df, x='category', y='value', estimator='mean', errorbar='sd', ax=ax)
ax.set_title('Mean Value by Category')
plt.show()

# Plotly
fig = px.bar(df.groupby('category')['value'].mean().reset_index(),
             x='category', y='value', title='Mean Value by Category')
fig.show()
```

### Grouped Bar Chart

```python
# Seaborn
fig, ax = plt.subplots(figsize=(12, 6))
sns.barplot(data=df, x='category', y='value', hue='group', ax=ax)
ax.set_title('Value by Category and Group')
plt.legend(title='Group')
plt.show()

# Plotly
fig = px.bar(df, x='category', y='value', color='group', barmode='group',
             title='Grouped Bar Chart')
fig.show()
```

### Stacked Bar Chart

```python
# Matplotlib
pivot = df.pivot_table(index='category', columns='group', values='value', aggfunc='sum')
pivot.plot(kind='bar', stacked=True, figsize=(10, 6))
plt.title('Stacked Bar Chart')
plt.ylabel('Total Value')
plt.show()

# Plotly
fig = px.bar(df, x='category', y='value', color='group', barmode='stack',
             title='Stacked Bar Chart')
fig.show()
```

## Relationship Visualizations

### Scatter Plot

```python
# Matplotlib
fig, ax = plt.subplots()
ax.scatter(df['x'], df['y'], alpha=0.5)
ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_title('Scatter Plot')
plt.show()

# Seaborn - with regression line
fig, ax = plt.subplots()
sns.regplot(data=df, x='x', y='y', ax=ax)
ax.set_title('Scatter with Regression')
plt.show()

# Seaborn - by category
fig, ax = plt.subplots()
sns.scatterplot(data=df, x='x', y='y', hue='category', size='value', ax=ax)
ax.set_title('Scatter by Category')
plt.show()

# Plotly - interactive
fig = px.scatter(df, x='x', y='y', color='category', size='value',
                 hover_data=['name'], title='Interactive Scatter')
fig.show()
```

### Line Plot

```python
# Matplotlib
fig, ax = plt.subplots()
ax.plot(df['date'], df['value'])
ax.set_xlabel('Date')
ax.set_ylabel('Value')
ax.set_title('Time Series')
plt.xticks(rotation=45)
plt.show()

# Seaborn
fig, ax = plt.subplots(figsize=(12, 6))
sns.lineplot(data=df, x='date', y='value', ax=ax)
plt.show()

# Multiple lines
fig, ax = plt.subplots(figsize=(12, 6))
sns.lineplot(data=df, x='date', y='value', hue='category', ax=ax)
ax.set_title('Multi-line Time Series')
plt.show()

# Plotly
fig = px.line(df, x='date', y='value', color='category', title='Interactive Line')
fig.show()
```

### Heatmap

```python
# Correlation heatmap
corr_matrix = df.select_dtypes(include=[np.number]).corr()

fig, ax = plt.subplots(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0, ax=ax)
ax.set_title('Correlation Matrix')
plt.show()

# Pivot heatmap
pivot = df.pivot_table(index='row_cat', columns='col_cat', values='value', aggfunc='mean')

fig, ax = plt.subplots(figsize=(12, 8))
sns.heatmap(pivot, annot=True, cmap='YlOrRd', ax=ax)
ax.set_title('Value Heatmap')
plt.show()

# Plotly
fig = px.imshow(corr_matrix, text_auto=True, title='Correlation Heatmap')
fig.show()
```

## Time Series Visualizations

### Basic Time Series

```python
# Set datetime index
df['date'] = pd.to_datetime(df['date'])
df = df.set_index('date')

# Plot
fig, ax = plt.subplots(figsize=(14, 6))
ax.plot(df.index, df['value'])
ax.set_title('Time Series')
ax.set_xlabel('Date')
ax.set_ylabel('Value')

# Format x-axis
import matplotlib.dates as mdates
ax.xaxis.set_major_locator(mdates.MonthLocator())
ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
plt.xticks(rotation=45)
plt.show()
```

### Multiple Time Series

```python
# Subplots
fig, axes = plt.subplots(2, 1, figsize=(14, 10), sharex=True)

axes[0].plot(df.index, df['metric1'])
axes[0].set_title('Metric 1')

axes[1].plot(df.index, df['metric2'], color='orange')
axes[1].set_title('Metric 2')

plt.tight_layout()
plt.show()

# Same plot, different y-axes
fig, ax1 = plt.subplots(figsize=(14, 6))
ax2 = ax1.twinx()

ax1.plot(df.index, df['metric1'], 'b-', label='Metric 1')
ax2.plot(df.index, df['metric2'], 'r-', label='Metric 2')

ax1.set_ylabel('Metric 1', color='blue')
ax2.set_ylabel('Metric 2', color='red')
ax1.legend(loc='upper left')
ax2.legend(loc='upper right')
plt.show()
```

### Rolling Statistics

```python
# Rolling mean and std
fig, ax = plt.subplots(figsize=(14, 6))
ax.plot(df.index, df['value'], alpha=0.5, label='Original')
ax.plot(df.index, df['value'].rolling(window=30).mean(), label='30-day MA')
ax.fill_between(
    df.index,
    df['value'].rolling(30).mean() - df['value'].rolling(30).std(),
    df['value'].rolling(30).mean() + df['value'].rolling(30).std(),
    alpha=0.2
)
ax.legend()
ax.set_title('Value with Rolling Statistics')
plt.show()
```

## Multi-Plot Layouts

### Subplots

```python
# Simple grid
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

sns.histplot(df['col1'], ax=axes[0, 0])
axes[0, 0].set_title('Column 1')

sns.histplot(df['col2'], ax=axes[0, 1])
axes[0, 1].set_title('Column 2')

sns.scatterplot(data=df, x='col1', y='col2', ax=axes[1, 0])
axes[1, 0].set_title('Scatter')

sns.boxplot(data=df, x='category', y='col1', ax=axes[1, 1])
axes[1, 1].set_title('Box Plot')

plt.tight_layout()
plt.show()
```

### FacetGrid (Seaborn)

```python
# Faceted histograms
g = sns.FacetGrid(df, col='category', col_wrap=3, height=4)
g.map(sns.histplot, 'value')
g.set_titles('{col_name}')
plt.show()

# Faceted scatter plots
g = sns.FacetGrid(df, col='category', row='group', height=4)
g.map(sns.scatterplot, 'x', 'y')
plt.show()
```

### Pair Plot

```python
# Pairwise relationships
sns.pairplot(df[['col1', 'col2', 'col3', 'category']], hue='category')
plt.show()

# With regression
sns.pairplot(df[['col1', 'col2', 'col3']], kind='reg')
plt.show()
```

## Customization

### Colors and Palettes

```python
# Seaborn palettes
sns.set_palette("husl")  # Default
sns.set_palette("Set2")  # Qualitative
sns.set_palette("Blues")  # Sequential
sns.set_palette("coolwarm")  # Diverging

# Custom colors
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
sns.barplot(data=df, x='category', y='value', palette=colors)

# Color by value
fig, ax = plt.subplots()
scatter = ax.scatter(df['x'], df['y'], c=df['value'], cmap='viridis')
plt.colorbar(scatter, label='Value')
plt.show()
```

### Annotations

```python
fig, ax = plt.subplots()
bars = ax.bar(categories.index, categories.values)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    ax.annotate(f'{height}',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center', va='bottom')

plt.show()
```

### Style and Theme

```python
# Seaborn styles
sns.set_style("whitegrid")  # White background with grid
sns.set_style("darkgrid")   # Gray background with grid
sns.set_style("white")      # White background, no grid
sns.set_style("dark")       # Gray background, no grid
sns.set_style("ticks")      # White with ticks

# Matplotlib styles
plt.style.use('seaborn')
plt.style.use('ggplot')
plt.style.use('fivethirtyeight')
plt.style.available  # List all styles
```

## Saving Plots

```python
# Matplotlib
fig.savefig('plot.png', dpi=300, bbox_inches='tight')
fig.savefig('plot.pdf', format='pdf', bbox_inches='tight')
fig.savefig('plot.svg', format='svg', bbox_inches='tight')

# Plotly
fig.write_image('plot.png', scale=2)
fig.write_html('plot.html')
```

## Dashboard-Style Layouts

```python
import matplotlib.gridspec as gridspec

fig = plt.figure(figsize=(16, 12))
gs = gridspec.GridSpec(3, 3, figure=fig)

# Large plot spanning 2 columns
ax1 = fig.add_subplot(gs[0, :2])
ax1.plot(df['date'], df['value'])
ax1.set_title('Main Metric Over Time')

# Small plot on right
ax2 = fig.add_subplot(gs[0, 2])
sns.boxplot(data=df, y='value', ax=ax2)
ax2.set_title('Distribution')

# Full-width plot
ax3 = fig.add_subplot(gs[1, :])
sns.heatmap(df.pivot_table(index='row', columns='col', values='value'), ax=ax3)
ax3.set_title('Heatmap')

# Three small plots at bottom
ax4 = fig.add_subplot(gs[2, 0])
ax5 = fig.add_subplot(gs[2, 1])
ax6 = fig.add_subplot(gs[2, 2])

sns.countplot(data=df, x='category', ax=ax4)
sns.histplot(df['value'], ax=ax5)
sns.scatterplot(data=df, x='x', y='y', ax=ax6)

plt.tight_layout()
plt.show()
```

## Best Practices

### Chart Selection Guide

| Data Type | Visualization |
|-----------|---------------|
| Distribution (single) | Histogram, Box plot, KDE |
| Distribution (by category) | Grouped box plot, Violin |
| Comparison (categories) | Bar chart |
| Relationship (2 numeric) | Scatter plot |
| Time series | Line plot |
| Part-to-whole | Pie chart, Stacked bar |
| Correlation | Heatmap |
| Multiple variables | Pair plot, Facet grid |

### Accessibility

```python
# Use colorblind-friendly palettes
sns.set_palette("colorblind")

# Add patterns/markers for differentiation
ax.plot(x, y1, '-o', label='Series 1')
ax.plot(x, y2, '--s', label='Series 2')

# Include legends and labels
ax.legend()
ax.set_xlabel('X Axis')
ax.set_ylabel('Y Axis')
```

### Performance

```python
# For large datasets, use rasterization
ax.scatter(x, y, rasterized=True)

# Sample for exploration
df_sample = df.sample(n=10000)
sns.scatterplot(data=df_sample, x='x', y='y')

# Use Plotly WebGL for large scatter plots
fig = px.scatter(df, x='x', y='y', render_mode='webgl')
```

## References

- Matplotlib: https://matplotlib.org/stable/gallery/index.html
- Seaborn: https://seaborn.pydata.org/examples/index.html
- Plotly: https://plotly.com/python/
