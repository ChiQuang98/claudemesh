---
name: python-conventions
description: Python coding best practices including naming conventions, clean code, code reuse, and PEP 8 standards. Use when writing Python code to ensure high-quality, maintainable code.
allowed-tools: Read, Write, Edit, Grep, Glob
user-invocable: true
---

# Python Coding Best Practices

## Overview

This skill provides comprehensive Python coding best practices based on PEP 8, clean code principles, and industry standards. Follow these guidelines to write maintainable, readable, and professional Python code.

## Naming Conventions (PEP 8)

### Variables and Functions

```python
# Good - snake_case for variables and functions
user_name = "John"
total_count = 42
customer_email = "john@example.com"

def calculate_total_price(items):
    pass

def fetch_user_data(user_id):
    pass

# Bad - Avoid camelCase, PascalCase, or mixed styles
userName = "John"  # Wrong
TotalCount = 42    # Wrong
customer_Email = "john@example.com"  # Wrong

def calculateTotalPrice(items):  # Wrong
    pass
```

### Classes

```python
# Good - PascalCase for classes
class UserAccount:
    pass

class DatabaseConnection:
    pass

class HTTPResponse:
    pass

# Bad
class user_account:  # Wrong
    pass

class database_connection:  # Wrong
    pass
```

### Constants

```python
# Good - UPPER_CASE for constants
MAX_CONNECTIONS = 100
DEFAULT_TIMEOUT = 30
API_BASE_URL = "https://api.example.com"
PI = 3.14159

# Bad
max_connections = 100  # Wrong - not clear it's a constant
MaxConnections = 100   # Wrong
```

### Private and Protected

```python
class BankAccount:
    def __init__(self, balance):
        self.account_id = "123"          # Public
        self._balance = balance           # Protected (single underscore)
        self.__pin = "1234"               # Private (double underscore)

    def get_balance(self):                # Public method
        return self._balance

    def _validate_transaction(self, amount):  # Protected method
        return amount <= self._balance

    def __encrypt_data(self, data):      # Private method
        return f"encrypted_{data}"
```

### Module and Package Names

```python
# Good - lowercase with underscores
import user_authentication
import data_processing
from database import connection_pool

# Bad
import UserAuthentication  # Wrong
import dataProcessing      # Wrong
```

### Special Method Names

```python
class DataContainer:
    def __init__(self, data):
        """Constructor - double underscore methods"""
        self.data = data

    def __str__(self):
        """String representation"""
        return f"DataContainer({self.data})"

    def __len__(self):
        """Length"""
        return len(self.data)

    def __getitem__(self, key):
        """Index access"""
        return self.data[key]
```

## Code Organization

### Imports

```python
# Good - Imports at the top of file, organized properly
# Standard library imports
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional

# Third-party imports
import pandas as pd
import numpy as np
import requests

# Local application imports
from my_package.models import User
from my_package.utils import validate_email

# Bad - Don't import inside functions (unless absolutely necessary)
def process_data():
    import pandas as pd  # Wrong - import at module level
    return pd.DataFrame()

# Exception: Only import inside function for optional dependencies
def use_optional_feature():
    try:
        import optional_library
        return optional_library.do_something()
    except ImportError:
        return fallback_implementation()
```

### Import Styles

```python
# Good - Explicit imports
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Acceptable - Import module
import json
import os

# Bad - Wildcard imports (avoid)
from module import *  # Wrong - unclear what's imported

# Bad - Aliasing without good reason
import numpy as n  # Wrong - use standard alias 'np'
import pandas as p  # Wrong - use standard alias 'pd'

# Good - Standard aliases
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
```

## Clean Code Principles

### Function Design

```python
# Good - Single Responsibility Principle
def validate_email(email: str) -> bool:
    """Validate email format."""
    import re
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email))

def send_email(to: str, subject: str, body: str) -> bool:
    """Send email via SMTP."""
    # Email sending logic
    pass

def validate_and_send_email(to: str, subject: str, body: str) -> bool:
    """Validate email and send if valid."""
    if not validate_email(to):
        raise ValueError(f"Invalid email: {to}")
    return send_email(to, subject, body)

# Bad - Function doing too many things
def process_user(user_data):  # Wrong - too many responsibilities
    # Validates user
    # Saves to database
    # Sends email
    # Logs activity
    # Updates cache
    pass
```

### Keep Functions Small

```python
# Good - Small, focused functions
def calculate_discount(price: float, discount_percent: float) -> float:
    """Calculate discounted price."""
    return price * (1 - discount_percent / 100)

def calculate_tax(price: float, tax_rate: float) -> float:
    """Calculate tax amount."""
    return price * tax_rate

def calculate_final_price(price: float, discount: float, tax_rate: float) -> float:
    """Calculate final price with discount and tax."""
    discounted_price = calculate_discount(price, discount)
    tax = calculate_tax(discounted_price, tax_rate)
    return discounted_price + tax

# Bad - Too long, doing too much
def calculate_everything(price, discount, tax, shipping, coupon, membership):
    # 100+ lines of complex calculations
    # Multiple nested if statements
    # Hard to test and maintain
    pass
```

### Meaningful Names

```python
# Good - Descriptive names
def get_active_users_count(users: List[User]) -> int:
    return len([u for u in users if u.is_active])

def filter_expired_sessions(sessions: List[Session]) -> List[Session]:
    current_time = datetime.now()
    return [s for s in sessions if s.expires_at > current_time]

# Bad - Unclear names
def get_count(data):  # What count? What data?
    return len([x for x in data if x.flag])

def filter_data(items):  # Filter by what criteria?
    now = datetime.now()
    return [i for i in items if i.time > now]
```

### Avoid Magic Numbers

```python
# Good - Named constants
MAX_LOGIN_ATTEMPTS = 3
SESSION_TIMEOUT_SECONDS = 3600
PAGINATION_DEFAULT_SIZE = 20

def check_login_attempts(attempts: int) -> bool:
    return attempts < MAX_LOGIN_ATTEMPTS

def get_page(page: int, size: int = PAGINATION_DEFAULT_SIZE) -> List:
    offset = page * size
    return fetch_items(offset, size)

# Bad - Magic numbers
def check_login_attempts(attempts: int) -> bool:
    return attempts < 3  # What is 3? Why 3?

def get_page(page: int) -> List:
    offset = page * 20  # Magic number
    return fetch_items(offset, 20)
```

## Code Reuse and DRY (Don't Repeat Yourself)

### Extract Common Logic

```python
# Good - Extract repeated logic into functions
def calculate_statistics(values: List[float]) -> Dict[str, float]:
    """Calculate common statistics."""
    return {
        'mean': sum(values) / len(values),
        'min': min(values),
        'max': max(values),
        'count': len(values)
    }

def analyze_sales(sales_data: List[float]) -> Dict:
    return calculate_statistics(sales_data)

def analyze_revenue(revenue_data: List[float]) -> Dict:
    return calculate_statistics(revenue_data)

# Bad - Repeated code
def analyze_sales(sales_data):
    mean = sum(sales_data) / len(sales_data)  # Duplicated
    min_val = min(sales_data)                 # Duplicated
    max_val = max(sales_data)                 # Duplicated
    return {'mean': mean, 'min': min_val, 'max': max_val}

def analyze_revenue(revenue_data):
    mean = sum(revenue_data) / len(revenue_data)  # Duplicated
    min_val = min(revenue_data)                   # Duplicated
    max_val = max(revenue_data)                   # Duplicated
    return {'mean': mean, 'min': min_val, 'max': max_val}
```

### Use Inheritance and Composition

```python
# Good - Use base classes for shared functionality
class BaseRepository:
    def __init__(self, db_connection):
        self.db = db_connection

    def find_by_id(self, table: str, id: int):
        return self.db.query(f"SELECT * FROM {table} WHERE id = ?", (id,))

    def delete(self, table: str, id: int):
        return self.db.execute(f"DELETE FROM {table} WHERE id = ?", (id,))

class UserRepository(BaseRepository):
    def find_by_email(self, email: str):
        return self.db.query("SELECT * FROM users WHERE email = ?", (email,))

class ProductRepository(BaseRepository):
    def find_by_category(self, category: str):
        return self.db.query("SELECT * FROM products WHERE category = ?", (category,))

# Bad - Duplicate code in each class
class UserRepository:
    def __init__(self, db):
        self.db = db

    def find_by_id(self, id):  # Duplicated
        return self.db.query(f"SELECT * FROM users WHERE id = ?", (id,))

    def delete(self, id):  # Duplicated
        return self.db.execute(f"DELETE FROM users WHERE id = ?", (id,))

class ProductRepository:
    def __init__(self, db):
        self.db = db

    def find_by_id(self, id):  # Duplicated
        return self.db.query(f"SELECT * FROM products WHERE id = ?", (id,))

    def delete(self, id):  # Duplicated
        return self.db.execute(f"DELETE FROM products WHERE id = ?", (id,))
```

### Use Decorators for Cross-Cutting Concerns

```python
# Good - Use decorators to avoid repetition
import functools
import time
from typing import Callable

def retry(max_attempts: int = 3):
    """Retry decorator for functions."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(2 ** attempt)
        return wrapper
    return decorator

def log_execution(func: Callable) -> Callable:
    """Log function execution."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"Executing {func.__name__}")
        result = func(*args, **kwargs)
        print(f"Completed {func.__name__}")
        return result
    return wrapper

@retry(max_attempts=3)
@log_execution
def fetch_data_from_api(url: str) -> dict:
    # API call logic
    pass

@retry(max_attempts=3)
@log_execution
def process_payment(amount: float) -> bool:
    # Payment processing logic
    pass

# Bad - Repeat retry/logging logic in every function
def fetch_data_from_api(url: str) -> dict:
    for attempt in range(3):  # Duplicated retry logic
        try:
            print(f"Executing fetch_data_from_api")  # Duplicated logging
            # API call
            print(f"Completed fetch_data_from_api")  # Duplicated logging
            return result
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
```

### Use Configuration Over Duplication

```python
# Good - Configuration-driven approach
SUPPORTED_FILE_FORMATS = {
    'csv': {
        'reader': pd.read_csv,
        'writer': pd.DataFrame.to_csv,
        'delimiter': ',',
    },
    'tsv': {
        'reader': pd.read_csv,
        'writer': pd.DataFrame.to_csv,
        'delimiter': '\t',
    },
    'json': {
        'reader': pd.read_json,
        'writer': pd.DataFrame.to_json,
        'orient': 'records',
    }
}

def read_file(filepath: str, format: str) -> pd.DataFrame:
    """Generic file reader based on format."""
    config = SUPPORTED_FILE_FORMATS.get(format)
    if not config:
        raise ValueError(f"Unsupported format: {format}")

    reader = config['reader']
    kwargs = {k: v for k, v in config.items() if k != 'reader'}
    return reader(filepath, **kwargs)

# Bad - Separate function for each format
def read_csv(filepath: str) -> pd.DataFrame:
    return pd.read_csv(filepath, delimiter=',')

def read_tsv(filepath: str) -> pd.DataFrame:
    return pd.read_csv(filepath, delimiter='\t')

def read_json(filepath: str) -> pd.DataFrame:
    return pd.read_json(filepath, orient='records')
```

## Type Hints and Documentation

### Use Type Hints

```python
from typing import List, Dict, Optional, Union, Tuple, Callable

# Good - Clear type hints
def process_users(
    users: List[Dict[str, str]],
    filter_func: Callable[[Dict], bool]
) -> List[Dict[str, str]]:
    """Process and filter users."""
    return [u for u in users if filter_func(u)]

def get_user_by_id(user_id: int) -> Optional[Dict[str, str]]:
    """Get user by ID, returns None if not found."""
    # Query logic
    pass

def calculate_price(
    base_price: float,
    quantity: int,
    discount: Optional[float] = None
) -> Tuple[float, float]:
    """Calculate price and tax."""
    final_price = base_price * quantity
    if discount:
        final_price *= (1 - discount)
    tax = final_price * 0.1
    return final_price, tax

# Bad - No type hints
def process_users(users, filter_func):  # Unclear types
    return [u for u in users if filter_func(u)]

def get_user_by_id(user_id):  # What type is user_id? What's returned?
    pass
```

### Write Clear Docstrings

```python
# Good - Clear, comprehensive docstrings
def calculate_compound_interest(
    principal: float,
    rate: float,
    time: int,
    frequency: int = 1
) -> float:
    """
    Calculate compound interest.

    Args:
        principal: Initial investment amount in dollars
        rate: Annual interest rate as decimal (e.g., 0.05 for 5%)
        time: Investment period in years
        frequency: Number of times interest is compounded per year (default: 1)

    Returns:
        Final amount after compound interest

    Raises:
        ValueError: If principal or time is negative

    Examples:
        >>> calculate_compound_interest(1000, 0.05, 10)
        1628.89
        >>> calculate_compound_interest(1000, 0.05, 10, 12)
        1647.01
    """
    if principal < 0 or time < 0:
        raise ValueError("Principal and time must be non-negative")

    return principal * (1 + rate / frequency) ** (frequency * time)

# Bad - Missing or poor docstrings
def calculate_compound_interest(principal, rate, time, frequency=1):
    # No docstring
    return principal * (1 + rate / frequency) ** (frequency * time)

def calc(p, r, t, f=1):  # Bad function and parameter names
    """Calculate something."""  # Vague docstring
    return p * (1 + r / f) ** (f * t)
```

## Error Handling

### Use Specific Exceptions

```python
# Good - Specific exceptions
class InvalidEmailError(ValueError):
    """Raised when email format is invalid."""
    pass

class UserNotFoundError(Exception):
    """Raised when user is not found."""
    pass

def validate_email(email: str) -> None:
    if '@' not in email:
        raise InvalidEmailError(f"Invalid email format: {email}")

def get_user(user_id: int) -> User:
    user = db.query(user_id)
    if not user:
        raise UserNotFoundError(f"User {user_id} not found")
    return user

# Use specific exceptions in try-except
try:
    validate_email(user_email)
    user = get_user(user_id)
except InvalidEmailError as e:
    print(f"Email error: {e}")
except UserNotFoundError as e:
    print(f"User error: {e}")

# Bad - Generic exceptions
def validate_email(email):
    if '@' not in email:
        raise Exception("Bad email")  # Too generic

try:
    validate_email(user_email)
    user = get_user(user_id)
except Exception:  # Catches everything, including bugs
    print("Something went wrong")
```

### Fail Fast

```python
# Good - Validate early
def process_order(order_id: int, items: List[Dict], payment: Dict) -> bool:
    # Validate all inputs first
    if not order_id or order_id < 0:
        raise ValueError("Invalid order_id")

    if not items:
        raise ValueError("Order must have at least one item")

    if not payment or not payment.get('method'):
        raise ValueError("Payment information required")

    # Now process
    total = calculate_total(items)
    charge_payment(payment, total)
    create_order(order_id, items)
    return True

# Bad - Validate late or not at all
def process_order(order_id, items, payment):
    total = calculate_total(items)  # Might crash if items is empty
    charge_payment(payment, total)  # Might crash if payment is invalid
    create_order(order_id, items)  # Might crash if order_id is invalid
```

## Code Formatting

### Line Length and Formatting

```python
# Good - Readable formatting
def create_user_account(
    username: str,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    date_of_birth: date,
    phone_number: Optional[str] = None
) -> User:
    """Create new user account."""
    return User(
        username=username,
        email=email,
        password=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        date_of_birth=date_of_birth,
        phone_number=phone_number,
        created_at=datetime.now()
    )

# Long expressions - break into multiple lines
result = (
    some_function(argument1, argument2)
    .chain_method_1()
    .chain_method_2(param1, param2)
    .chain_method_3()
)

# Bad - Too long
def create_user_account(username: str, email: str, password: str, first_name: str, last_name: str, date_of_birth: date, phone_number: Optional[str] = None) -> User:
    return User(username=username, email=email, password=hash_password(password), first_name=first_name, last_name=last_name, date_of_birth=date_of_birth, phone_number=phone_number, created_at=datetime.now())
```

### Whitespace and Blank Lines

```python
# Good - Proper spacing
def calculate_total(items: List[Item]) -> float:
    subtotal = sum(item.price * item.quantity for item in items)
    tax = subtotal * TAX_RATE
    return subtotal + tax


def apply_discount(total: float, discount_code: str) -> float:
    discount = get_discount_by_code(discount_code)
    return total * (1 - discount.percentage)


class OrderProcessor:
    def __init__(self, db_connection):
        self.db = db_connection

    def process(self, order: Order) -> bool:
        return self._validate(order) and self._save(order)

    def _validate(self, order: Order) -> bool:
        return order.total > 0 and order.items


# Bad - Inconsistent spacing
def calculate_total(items: List[Item]) -> float:
    subtotal=sum(item.price*item.quantity for item in items)  # No spaces
    tax=subtotal*TAX_RATE
    return subtotal+tax
def apply_discount(total,discount_code):  # No blank line between functions
    discount=get_discount_by_code(discount_code)
    return total*(1-discount.percentage)
```

## Testing Best Practices

### Write Testable Code

```python
# Good - Easy to test
def calculate_discount(price: float, discount_rate: float) -> float:
    """Pure function - easy to test."""
    return price * (1 - discount_rate)

def format_price(amount: float, currency: str = 'USD') -> str:
    """Pure function with default argument."""
    return f"{currency} {amount:.2f}"

# Use dependency injection
class EmailService:
    def __init__(self, smtp_client):
        self.smtp = smtp_client

    def send(self, to: str, subject: str, body: str) -> bool:
        return self.smtp.send_message(to, subject, body)

# Tests
def test_calculate_discount():
    assert calculate_discount(100, 0.1) == 90.0
    assert calculate_discount(50, 0.2) == 40.0

def test_email_service():
    mock_smtp = MockSMTPClient()
    service = EmailService(mock_smtp)
    assert service.send("test@example.com", "Hi", "Body")

# Bad - Hard to test
def calculate_and_send_email(price):  # Does too much
    discount = price * 0.1
    smtp = smtplib.SMTP('localhost')  # Hard-coded dependency
    smtp.send("admin@example.com", f"Discount: {discount}")
    return price - discount
```

## Performance Best Practices

### Use List Comprehensions

```python
# Good - List comprehensions (faster)
squares = [x**2 for x in range(10)]
even_numbers = [x for x in range(100) if x % 2 == 0]
upper_names = [name.upper() for name in names]

# Bad - Slower
squares = []
for x in range(10):
    squares.append(x**2)
```

### Use Generators for Large Data

```python
# Good - Generator (memory efficient)
def read_large_file(filepath: str):
    """Read file line by line."""
    with open(filepath, 'r') as f:
        for line in f:
            yield line.strip()

def process_numbers(limit: int):
    """Generate numbers on demand."""
    for i in range(limit):
        yield i * 2

# Usage
for line in read_large_file('large.txt'):
    process(line)

# Bad - Load everything into memory
def read_large_file(filepath: str) -> List[str]:
    with open(filepath, 'r') as f:
        return [line.strip() for line in f]  # Loads entire file
```

### Use Built-in Functions

```python
# Good - Use built-ins (optimized in C)
total = sum(numbers)
maximum = max(numbers)
sorted_list = sorted(numbers)
any_positive = any(x > 0 for x in numbers)
all_positive = all(x > 0 for x in numbers)

# Bad - Manual implementation (slower)
total = 0
for num in numbers:
    total += num
```

## Comments Best Practices

### Write Comments for "Why", Not "What"

```python
# Good - Explains WHY
def calculate_discount(price: float, customer_tier: str) -> float:
    # Apply higher discount for premium customers to encourage loyalty
    if customer_tier == 'premium':
        return price * 0.2
    return price * 0.1

# Cache results for 5 minutes to reduce database load during peak hours
@cache(ttl=300)
def get_product_details(product_id: int) -> dict:
    return db.query(product_id)

# Bad - Explains WHAT (code already shows this)
def calculate_discount(price, customer_tier):
    # Check if customer tier is premium
    if customer_tier == 'premium':
        # Return price times 0.2
        return price * 0.2
    # Return price times 0.1
    return price * 0.1
```

### Avoid Over-Commenting

```python
# Good - Self-documenting code, minimal comments
def is_valid_email(email: str) -> bool:
    """Check if email format is valid."""
    return '@' in email and '.' in email.split('@')[1]

def process_payment(amount: float, payment_method: str) -> bool:
    """Process payment using specified method."""
    if amount <= 0:
        raise ValueError("Amount must be positive")

    return payment_gateway.charge(amount, payment_method)

# Bad - Over-commented, verbose AI-generated style
def is_valid_email(email: str) -> bool:
    """
    Check if email format is valid.

    This function validates an email address by checking for the presence
    of an @ symbol and ensuring that there is at least one dot (.) after
    the @ symbol in the domain part of the email address.

    Args:
        email: The email address to validate as a string

    Returns:
        A boolean value indicating whether the email is valid or not.
        True means the email is valid, False means it is not valid.

    Example:
        >>> is_valid_email("user@example.com")
        True
        >>> is_valid_email("invalid.email")
        False
    """
    # First we check if the email contains an @ symbol
    # Then we split the email by @ and check the domain part
    # We need to ensure the domain has at least one dot
    return '@' in email and '.' in email.split('@')[1]  # Return the validation result
```

### Comment Only When Necessary

```python
# Good - Comments add value
def calculate_exponential_backoff(attempt: int, base_delay: float = 1.0) -> float:
    """Calculate delay for retry attempts."""
    # Use exponential backoff with jitter to prevent thundering herd
    delay = base_delay * (2 ** attempt)
    jitter = random.uniform(0, delay * 0.1)
    return delay + jitter

def parse_legacy_date_format(date_str: str) -> datetime:
    """Parse date from legacy system format."""
    # Legacy system uses MM-DD-YYYY format (non-standard)
    # TODO: Remove after migration to ISO 8601 (ticket #1234)
    return datetime.strptime(date_str, '%m-%d-%Y')

# Bad - Unnecessary comments
def get_user_age(birth_date: date) -> int:
    # Get today's date
    today = date.today()
    # Calculate age by subtracting birth year from current year
    age = today.year - birth_date.year
    # Return the age
    return age

# Good - Same logic, no comments needed (code is clear)
def get_user_age(birth_date: date) -> int:
    """Calculate user age from birth date."""
    today = date.today()
    return today.year - birth_date.year
```

### TODO Comments

```python
# Good - Clear TODOs with context
def process_payment(amount: float) -> bool:
    # TODO(username, 2024-03): Add fraud detection before processing
    # TODO: Implement retry logic (ticket #567)
    return payment_api.charge(amount)

# Bad - Vague TODOs
def process_payment(amount: float) -> bool:
    # TODO: fix this
    # TODO: make it better
    return payment_api.charge(amount)
```

## Logging Best Practices

### Use Logging, Not Print

```python
import logging

# Configure logging at module level
logger = logging.getLogger(__name__)

# Good - Use logging
def process_order(order_id: int) -> bool:
    logger.info(f"Processing order {order_id}")

    try:
        result = validate_and_charge(order_id)
        logger.info(f"Order {order_id} processed successfully")
        return result
    except PaymentError as e:
        logger.error(f"Payment failed for order {order_id}: {e}")
        return False
    except Exception as e:
        logger.exception(f"Unexpected error processing order {order_id}")
        raise

# Bad - Using print statements
def process_order(order_id: int) -> bool:
    print(f"Processing order {order_id}")  # Wrong

    try:
        result = validate_and_charge(order_id)
        print("Success!")  # Wrong - no context
        return result
    except Exception as e:
        print(f"Error: {e}")  # Wrong - can't control output/filtering
        raise
```

### Proper Log Levels

```python
import logging

logger = logging.getLogger(__name__)

def sync_data_from_api():
    # DEBUG - Detailed diagnostic information
    logger.debug("Fetching data from API endpoint: /api/v1/users")
    logger.debug(f"Request headers: {headers}")

    # INFO - General informational messages
    logger.info("Starting data sync from external API")
    logger.info(f"Synced {count} records successfully")

    # WARNING - Something unexpected but not critical
    logger.warning(f"API rate limit approaching: {remaining} requests left")
    logger.warning("Retrying after connection timeout")

    # ERROR - Serious problem, operation failed
    logger.error(f"Failed to sync data: {error_message}")
    logger.error("Database connection lost", exc_info=True)

    # CRITICAL - Critical failure, application may crash
    logger.critical("Database is unreachable, shutting down")

# Bad - Wrong log levels
def sync_data():
    logger.critical("Starting sync")  # Wrong - use INFO
    logger.debug("Payment failed!")   # Wrong - use ERROR
    logger.error("Request received")  # Wrong - use INFO/DEBUG
```

### Structured Logging

```python
import logging
import json

# Good - Structured logging with context
logger = logging.getLogger(__name__)

def process_transaction(user_id: int, amount: float, transaction_id: str):
    logger.info(
        "Transaction started",
        extra={
            'user_id': user_id,
            'amount': amount,
            'transaction_id': transaction_id,
            'timestamp': datetime.now().isoformat()
        }
    )

# Or use f-strings with consistent format
logger.info(
    f"Transaction {transaction_id}: user={user_id}, "
    f"amount={amount}, status=pending"
)

# Bad - Inconsistent, hard to parse
logger.info(f"User {user_id} transaction for {amount}")
logger.info(f"Transaction: {transaction_id}, user: {user_id}")  # Inconsistent format
logger.info("Processing transaction")  # Missing context
```

### Configure Logging Properly

```python
import logging
import sys

# Good - Proper logging configuration
def setup_logging(level: str = "INFO"):
    """Configure application logging."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('app.log')
        ]
    )

# In application entry point
if __name__ == "__main__":
    setup_logging(level="INFO")
    logger = logging.getLogger(__name__)
    logger.info("Application started")

# Bad - No logging configuration
def main():
    print("Starting app")  # Wrong
    logger.info("Processing")  # May not show up without config
```

### Don't Log Sensitive Information

```python
# Good - Safe logging
def authenticate_user(username: str, password: str) -> bool:
    logger.info(f"Authentication attempt for user: {username}")

    if not validate_credentials(username, password):
        logger.warning(f"Failed login attempt for user: {username}")
        return False

    logger.info(f"User {username} logged in successfully")
    return True

# Bad - Logging sensitive data
def authenticate_user(username: str, password: str) -> bool:
    logger.info(f"Login: {username}:{password}")  # NEVER log passwords!
    logger.debug(f"API key: {api_key}")  # NEVER log secrets!
    logger.info(f"Credit card: {card_number}")  # NEVER log PII!
```

## Documentation Best Practices

### Write Concise, Clear READMEs

```markdown
# Good - Clean, essential information

# User Authentication API

Simple JWT-based authentication for REST APIs.

## Installation
```bash
pip install auth-module
```

## Quick Start
```python
from auth import AuthManager

auth = AuthManager(secret_key="your-secret")
token = auth.create_token(user_id=123)
```

## Configuration
- `SECRET_KEY` - JWT signing key (required)
- `TOKEN_EXPIRY` - Token lifetime in seconds (default: 3600)

## API Reference
See [docs/api.md](docs/api.md)
```

```markdown
# Bad - Over-documented, AI-generated verbose style

# 🚀 User Authentication API 🔐

Welcome to the User Authentication API! This is a comprehensive, enterprise-grade,
production-ready authentication system that leverages the power of JSON Web Tokens
(JWT) to provide secure, scalable, and robust authentication mechanisms for your
modern web applications and microservices architecture.

## 📋 Table of Contents
- [Introduction](#introduction)
- [What is JWT?](#what-is-jwt)
- [Why Use This Library?](#why)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Using pip](#using-pip)
  - [Using poetry](#using-poetry)
  - [From source](#from-source)
- ... (50+ sections)

## 🌟 Introduction
In today's digital landscape, authentication is a critical component of any
application. Our User Authentication API provides a simple yet powerful way to...
(5 paragraphs explaining authentication)

## 🤔 What is JWT?
JSON Web Tokens (JWT) are an open, industry standard RFC 7519 method for
representing claims securely between two parties. They are compact, URL-safe...
(10 paragraphs explaining JWT)
```

### Keep Docstrings Concise

```python
# Good - Clear, concise docstring
def calculate_compound_interest(
    principal: float,
    rate: float,
    years: int
) -> float:
    """
    Calculate compound interest.

    Args:
        principal: Initial amount
        rate: Annual interest rate (e.g., 0.05 for 5%)
        years: Number of years

    Returns:
        Final amount after interest
    """
    return principal * (1 + rate) ** years

# Bad - Over-documented
def calculate_compound_interest(
    principal: float,
    rate: float,
    years: int
) -> float:
    """
    Calculate compound interest using the compound interest formula.

    This function takes an initial principal amount, an annual interest rate,
    and a number of years, and calculates the final amount after compound
    interest has been applied. The compound interest formula is one of the
    most fundamental formulas in finance and is used to calculate the future
    value of an investment.

    The formula used is: A = P(1 + r)^t
    Where:
    - A is the final amount
    - P is the principal (initial amount)
    - r is the annual interest rate (as a decimal)
    - t is the time in years

    Args:
        principal (float): The initial amount of money that is invested or
                          borrowed. This should be a positive number representing
                          the starting amount in your local currency.
        rate (float): The annual interest rate expressed as a decimal number.
                     For example, if you have a 5% interest rate, you would
                     pass 0.05 to this parameter. This should be between 0 and 1.
        years (int): The number of years for which the interest will be
                    compounded. This should be a positive integer representing
                    the duration of the investment or loan period.

    Returns:
        float: The final amount after compound interest has been applied.
              This represents the total value including both the principal
              and the accumulated interest over the specified time period.

    Examples:
        >>> calculate_compound_interest(1000, 0.05, 10)
        1628.89

        This example shows that if you invest $1000 at 5% annual interest
        for 10 years, you will have $1628.89 at the end.

    Note:
        This function assumes annual compounding. For different compounding
        frequencies, you would need to adjust the formula accordingly.

    See Also:
        - calculate_simple_interest(): For simple interest calculations
        - investment_calculator(): For more complex investment scenarios

    References:
        - Wikipedia article on Compound Interest
        - Financial Mathematics textbook, Chapter 3
    """
    # Calculate the compound interest using the standard formula
    # First we add 1 to the rate to get the growth factor
    # Then we raise it to the power of years
    # Finally we multiply by the principal
    return principal * (1 + rate) ** years  # Return the final amount
```

### Avoid Redundant Comments

```python
# Good - Code is self-explanatory
class User:
    def __init__(self, username: str, email: str):
        self.username = username
        self.email = email
        self.created_at = datetime.now()

    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE

# Bad - Redundant comments
class User:
    def __init__(self, username: str, email: str):
        """Initialize the User object."""  # Redundant
        self.username = username  # Set the username
        self.email = email        # Set the email
        self.created_at = datetime.now()  # Set creation timestamp

    def is_active(self) -> bool:
        """Check if user is active."""  # Redundant (name is clear)
        return self.status == UserStatus.ACTIVE  # Return active status
```

## Best Practices Checklist

### Code Quality
- [ ] Follow PEP 8 naming conventions
- [ ] Use type hints for function signatures
- [ ] Write clear docstrings for public functions/classes
- [ ] Keep functions small and focused (single responsibility)
- [ ] Use meaningful variable and function names
- [ ] Avoid magic numbers (use named constants)
- [ ] Imports at the top of file, properly organized
- [ ] No imports inside functions (unless exceptional case)

### Comments and Documentation
- [ ] Write comments for "why", not "what"
- [ ] Avoid over-commenting (let code be self-documenting)
- [ ] Remove redundant comments that just repeat the code
- [ ] Use TODO comments with context and ticket numbers
- [ ] Keep docstrings concise and valuable
- [ ] Write clean, essential READMEs (avoid AI verbosity)
- [ ] Document complex algorithms and business logic
- [ ] Don't document obvious code

### Logging
- [ ] Use logging instead of print statements
- [ ] Use appropriate log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- [ ] Configure logging at application startup
- [ ] Include context in log messages
- [ ] Never log sensitive information (passwords, API keys, PII)
- [ ] Use structured logging for better parsing
- [ ] Add exception info for ERROR logs (exc_info=True)

### Code Organization
- [ ] Extract repeated code into functions
- [ ] Use base classes for shared functionality
- [ ] Use decorators for cross-cutting concerns
- [ ] Keep related code together
- [ ] Separate concerns (presentation, business logic, data access)

### Error Handling
- [ ] Use specific exception types
- [ ] Fail fast - validate inputs early
- [ ] Provide helpful error messages
- [ ] Clean up resources properly (use context managers)

### Performance
- [ ] Use list comprehensions over loops
- [ ] Use generators for large datasets
- [ ] Use built-in functions over manual loops
- [ ] Avoid premature optimization

### Testing
- [ ] Write testable code (small, pure functions)
- [ ] Use dependency injection
- [ ] Separate business logic from I/O

## Tools for Maintaining Code Quality

### Linters and Formatters
```bash
# Black - Automatic code formatter
pip install black
black your_file.py

# Flake8 - Style guide enforcement
pip install flake8
flake8 your_file.py

# Pylint - Comprehensive code analysis
pip install pylint
pylint your_file.py

# MyPy - Static type checker
pip install mypy
mypy your_file.py

# isort - Sort imports
pip install isort
isort your_file.py
```

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.3.0
    hooks:
      - id: mypy
```

## Quick Reference

### Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Variables | snake_case | `user_name`, `total_count` |
| Functions | snake_case | `calculate_total()`, `get_user()` |
| Classes | PascalCase | `UserAccount`, `HTTPResponse` |
| Constants | UPPER_CASE | `MAX_SIZE`, `API_KEY` |
| Private | _prefix | `_internal_method()` |
| Protected | _prefix | `_helper_function()` |
| Module | snake_case | `data_processing.py` |

### Import Order
1. Standard library imports
2. Related third-party imports
3. Local application imports

### Line Length
- Maximum 79-88 characters per line
- 72 characters for docstrings/comments

### Log Levels
| Level | When to Use | Example |
|-------|-------------|---------|
| DEBUG | Detailed diagnostic info | `logger.debug(f"Request headers: {headers}")` |
| INFO | General informational messages | `logger.info("User logged in successfully")` |
| WARNING | Something unexpected but not critical | `logger.warning("API rate limit approaching")` |
| ERROR | Serious problem, operation failed | `logger.error("Payment processing failed")` |
| CRITICAL | Critical failure, may crash | `logger.critical("Database unreachable")` |

### Comments Guidelines
| Do ✅ | Don't ❌ |
|-------|----------|
| Explain **WHY** something is done | Explain **WHAT** code does |
| Comment complex algorithms | Comment obvious code |
| Add context for workarounds | Over-document with AI verbosity |
| Use TODO with tickets | Leave vague TODOs |
| Keep concise and valuable | Repeat what code shows |

### Documentation Guidelines
| Do ✅ | Don't ❌ |
|-------|----------|
| Write clear, essential READMEs | Write overly verbose docs |
| Keep docstrings concise | Add redundant docstrings |
| Focus on how to use | Explain basic concepts |
| Include quick examples | Write lengthy tutorials |
| Use simple language | Use excessive emojis/formatting |

## References

- PEP 8 Style Guide: https://pep8.org/
- PEP 257 Docstring Conventions: https://peps.python.org/pep-0257/
- Python Type Hints: https://docs.python.org/3/library/typing.html
- Python Logging: https://docs.python.org/3/library/logging.html
- Clean Code (Python): https://github.com/zedr/clean-code-python
- Real Python Best Practices: https://realpython.com/tutorials/best-practices/
