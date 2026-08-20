from sqlalchemy import create_engine


def connect_database(database_url: str):
    try:
        engine = create_engine(database_url)

        connection = engine.connect()
        connection.close()

        return engine

    except Exception as e:
        raise Exception(f"Database connection failed: {str(e)}")