from app.sql.generator import generate_sql_or_clarification
from app.sql.executor import execute_sql


class QueryMindAgent:

    def __init__(self, database_url: str):
        self.database_url = database_url

    def run(
        self,
        question: str,
        schema: dict,
        relationships: dict,
        conversation_history: list[dict] | None = None,
    ):
        try:
            decision = generate_sql_or_clarification(
                schema=schema,
                relationships=relationships,
                question=question,
                conversation_history=conversation_history,
            )

            if decision["type"] == "clarification":
                return {
                    "success": True,
                    "stage": "clarification",
                    "message": decision["message"],
                    "options": decision["options"],
                }

            sql = decision["sql"]

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