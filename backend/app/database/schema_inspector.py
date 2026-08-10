from sqlalchemy import inspect

from app.database.connection import create_db_engine

## To get the schema of the database
def get_schema(database_url: str):
    engine = create_db_engine(database_url)

    inspector = inspect(engine)

    tables = inspector.get_table_names()

    schema = {}

    for table in tables:
        columns = inspector.get_columns(table)

        schema[table] = [
            {
                "name": column["name"],
                "type": str(column["type"])
            }
            for column in columns
        ]

    return schema

## to get the foreign key relation
def get_relationships(database_url: str):
    engine = create_db_engine(database_url)

    inspector = inspect(engine)

    relationships = {}

    for table in inspector.get_table_names():
        foreign_keys = inspector.get_foreign_keys(table)

        relationships[table] = [
            {
                "column": fk["constrained_columns"],
                "references_table": fk["referred_table"],
                "references_column": fk["referred_columns"]
            }
            for fk in foreign_keys
        ]

    return relationships