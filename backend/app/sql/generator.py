import json

from app.llm.provider import get_llm
from app.sql.validator import validate_sql
from app.sql.schema_validator import validate_schema


def format_schema(schema: dict) -> str:
    lines = []
    for table, columns in schema.items():
        lines.append(f"Table: {table}")
        for column in columns:
            lines.append(f"  - {column['name']} ({column['type']})")
        lines.append("")
    return "\n".join(lines)


def format_relationships(relationships: dict) -> str:
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


def format_conversation_history(conversation_history: list[dict] | None) -> str:
    """
    conversation_history is a list of {"role": "assistant"|"user", "content": str}
    representing prior clarification exchanges for THIS question.
    """
    if not conversation_history:
        return "None"

    lines = []
    for turn in conversation_history:
        role = "Assistant" if turn.get("role") == "assistant" else "User"
        lines.append(f"{role}: {turn.get('content', '')}")
    return "\n".join(lines)


def clean_json_response(response: str) -> str:
    """
    Strip Markdown code fences the model may wrap JSON in.
    """
    text = response.strip()
    text = text.replace("```json", "").replace("```JSON", "").replace("```", "")
    return text.strip()


def _fallback_clarification(schema: dict, reason: str) -> dict:
    """
    Used when the LLM has already had a retry and still can't produce
    schema-valid SQL. Ask the user directly instead of surfacing a raw
    DB/validation error.
    """
    return {
        "type": "clarification",
        "message": (
            "I couldn't confidently map your question to the database "
            f"schema ({reason}). Could you clarify which table or column "
            "you mean?"
        ),
        "options": list(schema.keys())[:4],
    }


def generate_sql_or_clarification(
    schema: dict,
    relationships: dict,
    question: str,
    conversation_history: list[dict] | None = None,
    _retry_feedback: str | None = None,
) -> dict:
    """
    Returns one of:
      {"type": "sql", "sql": "SELECT ..."}
      {"type": "clarification", "message": "...", "options": ["...", "..."]}

    _retry_feedback is used internally: when the LLM's first SQL attempt
    fails validation (syntax or schema), we give it one retry with the
    specific failure reason. If that retry also fails, we fall back to
    asking the user a clarifying question instead of raising an error.
    """

    llm = get_llm()

    schema_text = format_schema(schema)
    relationships_text = format_relationships(relationships)
    history_text = format_conversation_history(conversation_history)

    retry_block = ""
    if _retry_feedback:
        retry_block = f"""
NOTE: Your previous attempt produced invalid SQL for this schema:
{_retry_feedback}

Fix the query so it only uses real tables/columns from the schema above,
or, if you cannot confidently do so, respond with a "clarification" object
instead of guessing.
"""

    prompt = f"""
You are an expert SQL query generator.

DATABASE SCHEMA:
{schema_text}

TABLE RELATIONSHIPS:
{relationships_text}

PRIOR CLARIFICATION EXCHANGE FOR THIS QUESTION (if any):
{history_text}

USER QUESTION:
{question}
{retry_block}
TASK:
Decide if the question, together with the schema and any prior
clarification exchange above, contains ENOUGH information to write
a single correct SQL SELECT query.

- If YES, respond with ONLY this JSON object:
{{"type": "sql", "sql": "<the SELECT query>"}}

- If NO (the question is ambiguous, refers to a column/table that
  could mean multiple things, is missing a filter like a date range,
  or is otherwise underspecified), respond with ONLY this JSON object:
{{"type": "clarification", "message": "<a short question asking the user for the missing detail>", "options": ["<option 1>", "<option 2>", "<option 3>"]}}

RULES:
- Respond with ONLY the JSON object. No explanation, no Markdown code blocks.
- "options" must be 2-4 short, concrete choices the user can pick from.
- Only offer clarification if it is genuinely needed — do not ask
  unnecessary questions when the request is already clear.
- Only use tables and columns from the provided schema.
- The "sql" value, when present, must be a single SELECT query only.
"""

    response = llm.invoke(prompt)
    raw = clean_json_response(response.content)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError(
            f"LLM did not return valid JSON.\nRaw response:\n{response.content}"
        )

    response_type = parsed.get("type")

    if response_type == "clarification":
        message = parsed.get("message", "").strip()
        options = parsed.get("options", [])

        if not message or not options:
            raise ValueError(
                f"LLM clarification response missing 'message' or 'options'.\n"
                f"Raw response:\n{response.content}"
            )

        return {
            "type": "clarification",
            "message": message,
            "options": options,
        }

    if response_type == "sql":
        sql = parsed.get("sql", "").strip()

        # 1. Syntax / safety validation (SELECT-only, no forbidden keywords)
        is_valid, message = validate_sql(sql)

        # 2. Schema validation (tables/columns must actually exist)
        if is_valid:
            is_valid, message = validate_schema(sql, schema)

        if not is_valid:
            if _retry_feedback is not None:
                # Already retried once and it still failed — stop guessing
                # and ask the user instead of raising a raw error.
                return _fallback_clarification(schema, message)

            # First failure — give the LLM one shot to self-correct or
            # to ask a clarifying question instead of guessing again.
            return generate_sql_or_clarification(
                schema=schema,
                relationships=relationships,
                question=question,
                conversation_history=conversation_history,
                _retry_feedback=message,
            )

        return {"type": "sql", "sql": sql}

    raise ValueError(
        f"LLM returned unrecognized type '{response_type}'.\n"
        f"Raw response:\n{response.content}"
    )