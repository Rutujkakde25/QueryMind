from app.llm.provider import get_llm
from app.sql.validator import validate_sql


def format_schema(schema: dict) -> str:
    """
    Convert database schema into a format
    that is easy for the LLM to understand.
    """
    lines = []

    for table, columns in schema.items():
        lines.append(f"Table: {table}")

        for column in columns:
            lines.append(
                f"  - {column['name']} ({column['type']})"
            )

        lines.append("")

    return "\n".join(lines)


def format_relationships(relationships: dict) -> str:
    """
    Convert foreign-key relationships into
    a readable format for the LLM.
    """
    lines = []

    for table, foreign_keys in relationships.items():
        for fk in foreign_keys:
            columns = ", ".join(fk["column"])
            referenced_columns = ", ".join(fk["references_column"])

            lines.append(
                f"{table}.{columns} -> "
                f"{fk['references_table']}.{referenced_columns}"
            )

    if not lines:
        return "No foreign-key relationships found."

    return "\n".join(lines)


def clean_sql_response(response: str) -> str:
    """
    Clean the LLM response and extract the SQL query.
    """
    sql = response.strip()

    sql = sql.replace("```sql", "")
    sql = sql.replace("```SQL", "")
    sql = sql.replace("```", "")

    sql = sql.strip()

    select_position = sql.upper().find("SELECT")

    if select_position != -1:
        sql = sql[select_position:]

    return sql.strip()


def generate_sql(
    schema: dict,
    relationships: dict,
    question: str
) -> str:

    llm = get_llm()

    schema_text = format_schema(schema)
    relationships_text = format_relationships(relationships)

    prompt = f"""
You are an expert SQL query generator.

Convert the user's natural language question
into a valid SQL query.

DATABASE SCHEMA:
{schema_text}

TABLE RELATIONSHIPS:
{relationships_text}

USER QUESTION:
{question}

RULES:
- Generate ONLY the SQL query.
- Do NOT explain the query.
- Do NOT use Markdown code blocks.
- Use only tables and columns from the provided schema.
- Use the provided relationships when JOINs are required.
- Do not invent tables or columns.
- Only generate SELECT queries.
"""

    response = llm.invoke(prompt)

    sql = clean_sql_response(response.content)

    is_valid, message = validate_sql(sql)

    if not is_valid:
        raise ValueError(
            f"Generated SQL is invalid: {message}\n"
            f"Generated response:\n{response.content}"
        )

    return sql