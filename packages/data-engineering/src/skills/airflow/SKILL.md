---
name: airflow
description: Apache Airflow workflows and DAGs. Use when designing data pipelines, scheduling ETL jobs, or orchestrating data workflows.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Apache Airflow

## Overview
Apache Airflow is a platform to programmatically author, schedule, and monitor workflows.

## Core Concepts

### DAG (Directed Acyclic Graph)
```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['data-team@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'etl_pipeline',
    default_args=default_args,
    description='ETL pipeline for data processing',
    schedule_interval='@daily',  # Cron expression: 0 0 * * *
    catchup=False,
    tags=['etl', 'production'],
    max_active_runs=1,
) as dag:

    # Extract task
    extract = BashOperator(
        task_id='extract_data',
        bash_command='python scripts/extract.py',
    )

    # Transform task
    transform = BashOperator(
        task_id='transform_data',
        bash_command='python scripts/transform.py',
    )

    # Load task
    load = BashOperator(
        task_id='load_data',
        bash_command='python scripts/load.py',
    )

    # Define dependencies
    extract >> transform >> load
```

### Task Instances and Operators
```python
# PythonOperator
from airflow.operators.python import PythonOperator

def process_data(**context):
    ti = context['task_instance']
    ds = context['ds']  # Execution date
    print(f"Processing data for {ds}")

process_task = PythonOperator(
    task_id='process_data',
    python_callable=process_data,
)

# with arguments
def process_data(file_path: str, **context):
    print(f"Processing {file_path}")

process_task = PythonOperator(
    task_id='process_data',
    python_callable=process_data,
    op_kwargs={'file_path': '/data/input.csv'},
)

# Sensor (wait for condition)
from airflow.sensors.filesystem import FileSensor

wait_for_file = FileSensor(
    task_id='wait_for_file',
    filepath='/data/input.csv',
    poke_interval=60,  # Check every 60 seconds
    timeout=3600,  # Fail after 1 hour
    mode='poke',  # or 'reschedule'
)
```

## Advanced Patterns

### TaskFlow API (Modern)
```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)
def etl_pipeline():

    @task
    def extract():
        import pandas as pd
        data = pd.read_csv('s3://bucket/input.csv')
        return data.to_json()

    @task
    def transform(data_json: str):
        import pandas as pd
        data = pd.read_json(data_json)
        # Transform data
        transformed = data.groupby('category').sum()
        return transformed.to_json()

    @task
    def load(transformed_json: str):
        import pandas as pd
        data = pd.read_json(transformed_json)
        # Load to database
        data.to_sql('table', con='db_connection')

    # Define dependencies
    data = extract()
    transformed = transform(data)
    load(transformed)

etl_pipeline()
```

### Dynamic Task Mapping
```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)
def process_files():

    @task
    def get_files():
        return ['file1.csv', 'file2.csv', 'file3.csv']

    @task
    def process_file(file_name: str):
        print(f"Processing {file_name}")
        # Process individual file
        return f"Processed {file_name}"

    files = get_files()
    processed_files = process_file.expand(file_name=files)

    @task
    def aggregate(results):
        print(f"Aggregated {len(results)} files")

    aggregate(processed_files)

process_files()
```

### XCom (Cross-Communication)
```python
from airflow.operators.python import PythonOperator

def push_data(**context):
    data = {'key': 'value'}
    ti = context['task_instance']
    ti.xcom_push(key='my_data', value=data)

def pull_data(**context):
    ti = context['task_instance']
    data = ti.xcom_pull(key='my_data', task_ids='push_task')
    print(f"Pulled: {data}")

push_task = PythonOperator(
    task_id='push_task',
    python_callable=push_data,
)

pull_task = PythonOperator(
    task_id='pull_task',
    python_callable=pull_data,
)

push_task >> pull_task
```

## Operators

### Common Operators
```python
# BashOperator
from airflow.operators.bash import BashOperator

run_script = BashOperator(
    task_id='run_script',
    bash_command='python script.py --date {{ ds }}',
    env={'ENV_VAR': 'value'},
)

# PostgresOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator

insert_query = PostgresOperator(
    task_id='insert_data',
    sql='''
        INSERT INTO table (date, value)
        VALUES ('{{ ds }}', '{{ params.value }}');
    ''',
    params={'value': 123},
)

# SnowflakeOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator

snowflake_query = SnowflakeOperator(
    task_id='snowflake_query',
    sql='SELECT * FROM table WHERE date = {{ ds }}',
    snowflake_conn_id='snowflake_default',
)

# BigQueryOperator
from airflow.providers.google.cloud.operators.bigquery import BigQueryExecuteQueryOperator

bq_query = BigQueryExecuteQueryOperator(
    task_id='bq_query',
    sql='SELECT * FROM `project.dataset.table`',
    use_legacy_sql=False,
)

# S3ToRedshiftOperator
from airflow.providers.amazon.aws.transfers.s3_to_redshift import S3ToRedshiftOperator

s3_to_redshift = S3ToRedshiftOperator(
    task_id='s3_to_redshift',
    s3_bucket='my-bucket',
    s3_key='path/to/data.csv',
    schema='public',
    table='my_table',
    redshift_conn_id='redshift_default',
    aws_conn_id='aws_default',
    copy_options=['DELIMITER ","', 'IGNOREHEADER 1'],
)

# DataflowOperator (Google Cloud)
from airflow.providers.google.cloud.operators.dataflow import DataflowCreatePythonJobOperator

dataflow_job = DataflowCreatePythonJobOperator(
    task_id='dataflow_job',
    py_file='gs://bucket/pipeline.py',
    job_name='my-dataflow-job',
    options={'input': 'gs://bucket/input', 'output': 'gs://bucket/output'},
)
```

### Custom Operator
```python
from airflow.models.baseoperator import BaseOperator

class MyCustomOperator(BaseOperator):

    template_fields = ['input_path', 'output_path']  # Jinja templating

    def __init__(
        self,
        input_path: str,
        output_path: str,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.input_path = input_path
        self.output_path = output_path

    def execute(self, context):
        # Your custom logic here
        print(f"Processing {self.input_path}")
        # Process data...
        print(f"Saving to {self.output_path}")

# Usage
custom_task = MyCustomOperator(
    task_id='custom_task',
    input_path='/data/input.csv',
    output_path='/data/output.csv',
)
```

## Scheduling and Triggers

### Schedule Intervals
```python
# Cron expressions
schedule_interval='0 0 * * *'  # Daily at midnight
schedule_interval='0 */6 * * *'  # Every 6 hours
schedule_interval='0 9 * * 1-5'  # 9 AM on weekdays
schedule_interval='@once'  # Run once
schedule_interval='@hourly'  # Every hour
schedule_interval='@daily'  # Daily at midnight
schedule_interval='@weekly'  # Weekly
schedule_interval='@monthly'  # Monthly
schedule_interval=None  # Manual trigger only
```

### Manual Triggers
```python
# Trigger DAG from code
from airflow import models
from airflow.utils.session import create_session

with create_session() as session:
    dag = session.get(models.DagModel, 'my_dag_id')
    dag.create_dagrun(
        run_id='manual_run',
        execution_date=datetime.now(),
        state='running',
    )
```

## Connections and Variables

### Using Connections
```python
# Define connection in Airflow UI
# Conn ID: my_postgres
# Conn Type: Postgres
# Host: localhost
# Schema: my_database
# Login: user
# Password: password
# Port: 5432

# Use in DAG
from airflow.providers.postgres.hooks.postgres import PostgresHook

def query_postgres():
    hook = PostgresHook(postgres_conn_id='my_postgres')
    conn = hook.get_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM table')
    results = cursor.fetchall()
    return results

query_task = PythonOperator(
    task_id='query_postgres',
    python_callable=query_postgres,
)
```

### Using Variables
```python
from airflow.models import Variable

# Get variable
api_key = Variable.get('api_key')

# Get JSON variable
config = Variable.get('config', deserialize_json=True)

# Set variable (from DAG code)
Variable.set('my_var', 'value')
```

## Best Practices

### ✅ DO:
- Use TaskFlow API for new DAGs
- Keep tasks idempotent
- Use meaningful task IDs
- Set appropriate timeouts
- Use sensors for external dependencies
- Implement proper error handling
- Use XComs for small data only
- Document complex DAGs
- Test DAGs locally
- Use connection pooling

### ❌ DON'T:
- Create top-heavy DAGs (too many tasks)
- Put large data in XComs
- Use hard-coded values
- Ignore timezone handling
- Create circular dependencies
- Skip proper error handling
- Forget to set timeouts
- Use dynamic DAGs unnecessarily
- Ignore resource limits
- Create overly complex DAGs

## Common Patterns

### ETL Pipeline
```python
@dag(
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)
def etl_dag():

    @task
    def extract_from_api():
        import requests
        response = requests.get('https://api.example.com/data')
        return response.json()

    @task
    def transform_data(raw_data):
        # Transform logic
        return transformed_data

    @task
    def load_to_db(transformed_data):
        hook = PostgresHook(postgres_conn_id='postgres_default')
        hook.insert_rows(table='target_table', rows=transformed_data)

    # Pipeline
    raw_data = extract_from_api()
    transformed_data = transform_data(raw_data)
    load_to_db(transformed_data)

etl_dag()
```

### Data Quality Checks
```python
@dag(
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)
def data_quality_dag():

    @task
    def check_row_count():
        hook = PostgresHook(postgres_conn_id='postgres_default')
        df = hook.get_pandas_df('SELECT COUNT(*) as count FROM table')
        count = df['count'][0]
        if count < 1000:
            raise ValueError(f"Row count too low: {count}")
        return count

    @task
    def check_null_values():
        hook = PostgresHook(postgres_conn_id='postgres_default')
        df = hook.get_pandas_df('SELECT COUNT(*) - COUNT(col) as nulls FROM table')
        nulls = df['nulls'][0]
        if nulls > 0:
            raise ValueError(f"Found {nulls} null values")
        return nulls

    @task
    def send_alert(message: str):
        # Send alert (email, Slack, etc.)
        print(f"ALERT: {message}")

    # Quality checks
    count = check_row_count()
    nulls = check_null_values()

    # Branch based on results
    [count, nulls] >> send_alert("Quality checks passed")

data_quality_dag()
```

### Backfill Handling
```python
# For large backfills, use batch processing
@dag(
    schedule_interval='@daily',
    start_date=datetime(2020, 1, 1),  # Old start date
    catchup=False,  # Set to False, use custom backfill
    max_active_runs=3,  # Limit concurrent runs
)
def backfill_dag():

    @task
    def process_date(**context):
        execution_date = context['ds']
        # Process specific date
        print(f"Processing {execution_date}")

    process_date()

backfill_dag()

# Then manually trigger for specific date ranges
# or use: airflow dags trigger -e 2020-01-01 -s 2020-12-31 my_dag
```

## Monitoring and Alerting

### Email on Failure
```python
default_args = {
    'owner': 'data-team',
    'email': ['data-team@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
}
```

### Slack Alert
```python
def alert_slack(context):
    from airflow.providers.slack.operators.slack import SlackAPIPostOperator

    SlackAPIPostOperator(
        task_id='slack_alert',
        slack_conn_id='slack_default',
        text=f"DAG {context['dag'].dag_id} failed!",
        channel='#data-alerts',
    ).execute(context=context)

# Use in on_failure_callback
with DAG(
    'my_dag',
    default_args=default_args,
    on_failure_callback=alert_slack,
) as dag:
    # Tasks...
    pass
```

## Testing

### Unit Testing DAGs
```python
import pytest
from airflow.models import DagBag

def test_dag_loaded():
    dag_bag = DagBag()
    assert dag_bag.import_errors == {}
    assert 'my_dag' in dag_bag.dags

def test_dag_structure():
    dag_bag = DagBag()
    dag = dag_bag.get_dag('my_dag')
    assert len(dag.tasks) == 3
    assert dag.tasks[0].task_id == 'extract'
```

### Load Testing
```python
from airflow.utils.state import DagRunState
from airflow import settings
from airflow.models import DagRun

def test_dag_execution():
    dag_bag = DagBag()
    dag = dag_bag.get_dag('my_dag')

    dr = dag.create_dagrun(
        run_id='test_run',
        execution_date=datetime.now(),
        state=DagRunState.RUNNING,
    )

    ti = dr.get_task_instance('extract')
    ti.run()
    assert ti.state == 'success'
```
