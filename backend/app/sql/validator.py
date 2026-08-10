import re


FORBIDDEN_KEYWORDS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
]


def validate_sql(sql: str) -> tuple[bool, str]:
    sql = sql.strip()

    if not sql:
        return False, "SQL query is empty"

    # Remove trailing semicolon for checking
    cleaned_sql = sql.rstrip(";").strip()

    # Only SELECT queries are allowed
    if not re.match(r"^SELECT\b", cleaned_sql, re.IGNORECASE):
        return False, "Only SELECT queries are allowed"

    # Check for dangerous SQL commands
    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", cleaned_sql, re.IGNORECASE):
            return False, f"Forbidden SQL operation: {keyword}"

    return True, "SQL query is valid"