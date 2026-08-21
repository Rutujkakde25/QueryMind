"""
Database layer for the AskDB local agent.

This mirrors app/database/schema_inspector.py, app/sql/executor.py and
app/sql/validator.py from the main backend, kept dependency-light
(sqlalchemy only) so the PyInstaller binary stays small.
"""

import re
from sqlalchemy import create_engine, inspect, text

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP",
    "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE",
]


def build_database_url(db_type: str, host: str, port: str, username: str,
                        password: str, database: str) -> str:
    """Build a SQLAlchemy URL from individual connect-form fields."""
    drivers = {
        "postgresql": "postgresql+psycopg2",
        "mysql": "mysql+pymysql",
    }
    driver = drivers.get(db_type, db_type)
    return f"{driver}://{username}:{password}@{host}:{port}/{database}"


def test_connection(database_url: str) -> None:
    """Raises if the connection can't be established."""
    engine = create_engine(database_url, pool_pre_ping=True)
    with engine.connect():
        pass


def get_schema(database_url: str) -> dict:
    engine = create_engine(database_url, pool_pre_ping=True)
    inspector = inspect(engine)
    schema = {}
    for table in inspector.get_table_names():
        columns = inspector.get_columns(table)
        schema[table] = [
            {"name": c["name"], "type": str(c["type"])} for c in columns
        ]
    return schema


def get_relationships(database_url: str) -> dict:
    engine = create_engine(database_url, pool_pre_ping=True)
    inspector = inspect(engine)
    relationships = {}
    for table in inspector.get_table_names():
        fks = inspector.get_foreign_keys(table)
        relationships[table] = [
            {
                "column": fk["constrained_columns"],
                "references_table": fk["referred_table"],
                "references_column": fk["referred_columns"],
            }
            for fk in fks
        ]
    return relationships


def validate_sql(sql: str) -> tuple[bool, str]:
    sql = sql.strip()
    if not sql:
        return False, "SQL query is empty"

    cleaned_sql = sql.rstrip(";").strip()

    if not re.match(r"^SELECT\b", cleaned_sql, re.IGNORECASE):
        return False, "Only SELECT queries are allowed"

    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", cleaned_sql, re.IGNORECASE):
            return False, f"Forbidden SQL operation: {keyword}"

    return True, "SQL query is valid"


def execute_sql(database_url: str, sql: str) -> list[dict]:
    # Defense in depth: the cloud backend should already validate before
    # dispatching, but the agent re-checks locally too — never trust the wire.
    ok, message = validate_sql(sql)
    if not ok:
        raise ValueError(message)

    engine = create_engine(database_url, pool_pre_ping=True)
    with engine.connect() as connection:
        result = connection.execute(text(sql))
        rows = result.mappings().all()
    return [dict(row) for row in rows]
