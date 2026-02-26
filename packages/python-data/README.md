# @claudemesh/python-data

Python data science and backend development agents and skills for Claude Code.

## Features

### Skills

#### `/python-conventions` ⭐ NEW
Python coding best practices including:
- **Naming Conventions**: PEP 8 compliant naming for variables, functions, classes, constants
- **Clean Code**: Single responsibility, meaningful names, small functions
- **Code Reuse**: DRY principle, inheritance, decorators, configuration-driven code
- **No Code Duplication**: Extract common logic, use base classes
- **Import Best Practices**: Imports at module level, proper organization
- **Comments**: Write "why" not "what", avoid over-commenting, no AI verbosity
- **Logging**: Use logging instead of print, proper log levels, structured logging
- **Documentation**: Concise docstrings, clean READMEs, essential information only
- **Type Hints**: Comprehensive type annotations
- **Error Handling**: Specific exceptions, fail fast
- **Performance**: List comprehensions, generators, built-in functions

Use when writing Python code to ensure high-quality, maintainable code.

#### `/data-cleaning`
Pandas data cleaning patterns and best practices.
- Missing value handling
- Duplicate detection and removal
- Data type conversion
- Outlier detection
- Data validation

#### `/visualization`
Data visualization best practices with matplotlib, seaborn, and plotly.

#### `/jupyter-patterns`
Jupyter notebook best practices and common patterns.

### Agents

#### `pandas-expert`
Expert in pandas data manipulation, analysis, and performance optimization.

#### `data-visualization`
Specialist in creating effective data visualizations and dashboards.

## Installation

### Local Installation
```bash
cd your-project
ccmesh add python-data
```

### Global Installation
```bash
ccmesh add python-data --global
```

## Usage

### Use Skills Directly
```bash
# In Claude Code
> /python-conventions
> /data-cleaning
```

### Or Ask Claude
```bash
> "Review my Python code for best practices"
> "Help me follow PEP 8 naming conventions"
> "Refactor this code to avoid duplication"
> "Clean this messy dataset"
```

## Quick Start Examples

### Python Best Practices
```python
# Claude will help you write code like this:

from typing import List, Optional

class UserAccount:
    """User account with proper naming and type hints."""

    def __init__(self, username: str, email: str):
        self.username = username
        self.email = email
        self._password_hash: Optional[str] = None

    def validate_email(self) -> bool:
        """Validate email format."""
        return '@' in self.email and '.' in self.email

def calculate_total_price(
    items: List[dict],
    tax_rate: float,
    discount_rate: float = 0.0
) -> float:
    """
    Calculate total price with tax and discount.

    Args:
        items: List of items with 'price' and 'quantity'
        tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)
        discount_rate: Discount rate as decimal (default: 0.0)

    Returns:
        Total price after discount and tax
    """
    subtotal = sum(item['price'] * item['quantity'] for item in items)
    discounted = subtotal * (1 - discount_rate)
    return discounted * (1 + tax_rate)
```

### Data Cleaning
```python
import pandas as pd

# Claude will guide you through proper data cleaning
df = pd.read_csv('data.csv')

# Handle missing values
df['age'] = df['age'].fillna(df['age'].median())

# Remove duplicates
df = df.drop_duplicates(subset=['id'])

# Validate data
assert df['age'].between(0, 120).all()
```

## What's Different About This Skill?

The `/python-conventions` skill is comprehensive and covers:

1. **Complete PEP 8 Coverage**: All naming conventions clearly explained
2. **Practical Examples**: Good vs Bad code comparisons
3. **Code Reuse Patterns**: DRY principle with real examples
4. **No Import in Functions**: Clear guidance on import best practices
5. **Type Hints**: Modern Python type annotation patterns
6. **Testing Best Practices**: Write testable, maintainable code
7. **Performance Tips**: Built-in functions, generators, comprehensions
8. **Tool Integration**: Black, Flake8, MyPy, Pylint setup

## Development

### Project Structure
```
packages/python-data/
├── src/
│   ├── agents/
│   │   ├── pandas-expert.md
│   │   └── data-visualization.md
│   └── skills/
│       ├── python-conventions/  ⭐ NEW
│       │   └── SKILL.md
│       ├── data-cleaning/
│       │   └── SKILL.md
│       ├── visualization/
│       │   └── SKILL.md
│       └── jupyter-patterns/
│           └── SKILL.md
├── package.json
└── README.md
```

## Contributing

To add new skills or improve existing ones:

1. Create a new directory in `src/skills/`
2. Add a `SKILL.md` file with the skill content
3. Follow the existing skill format
4. Test with Claude Code
5. Submit a PR

## License

MIT
