from sqlalchemy import text

from app.database.connection import create_db_engine


def execute_sql(database_url: str, sql: str):
    engine = create_db_engine(database_url)

    with engine.connect() as connection:
        result = connection.execute(text(sql))

        rows = result.mappings().all()

    return [dict(row) for row in rows]