from app.sql.generator import generate_sql
from app.sql.executor import execute_sql


class QueryMindAgent:

    def __init__(self, database_url: str):
        self.database_url = database_url

    def run(
        self,
        question: str,
        schema: dict,
        relationships: dict,
    ):
        try:
            sql = generate_sql(
                schema=schema,
                relationships=relationships,
                question=question,
            )

            results = execute_sql(
                database_url=self.database_url,
                sql=sql,
            )

            return {
                "success": True,
                "stage": "execution",
                "sql": sql,
                "results": results,
                "row_count": len(results),
            }

        except Exception as e:
            return {
                "success": False,
                "stage": "execution",
                "error": str(e),
                "sql": locals().get("sql"),
            }