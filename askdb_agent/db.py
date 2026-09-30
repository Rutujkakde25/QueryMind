"""
Database layer for the AskDB local agent.

This mirrors app/database/schema_inspector.py, app/sql/executor.py and
app/sql/validator.py from the main backend, kept dependency-light
(sqlalchemy only) so the PyInstaller binary stays small.
"""

import re
from sqlalchemy import create_engine, inspect, text
from sqlalchemy import URL

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP",
    "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE",
]


def build_database_url(db_type, host, port, username, password, database):
    drivers = {"postgresql": "postgresql+psycopg2", "mysql": "mysql+pymysql"}
    return URL.create(
        drivers.get(db_type, db_type),
        username=username, password=password,
        host=host, port=int(port), database=database,
    )


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


def execute_sql(database_url, sql: str, max_rows: int = 1000) -> list[dict]:
    ok, message = validate_sql(sql)
    if not ok:
        raise ValueError(message)

    engine = create_engine(database_url, pool_pre_ping=True)
    with engine.connect() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(text("SET TRANSACTION READ ONLY"))
            conn.execute(text("SET LOCAL statement_timeout = 15000"))
        elif engine.dialect.name == "mysql":
            conn.execute(text("SET SESSION TRANSACTION READ ONLY"))
            conn.execute(text("SET SESSION MAX_EXECUTION_TIME = 15000"))
        rows = conn.execute(text(sql)).mappings().fetchmany(max_rows)
    return [dict(r) for r in rows]