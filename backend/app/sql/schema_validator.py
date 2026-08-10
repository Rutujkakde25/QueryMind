import re


def validate_schema(sql: str, schema: dict) -> tuple[bool, str]:
    """
    Validate tables and columns in SQL against the database schema.
    Supports SQL table aliases such as:

        FROM users AS T1
        JOIN orders AS T2
    """

    # --------------------------------------------------
    # 1. Find tables and their aliases
    # --------------------------------------------------

    table_aliases = {}

    table_matches = re.findall(
        r"\b(?:FROM|JOIN)\s+"
        r"([a-zA-Z_][a-zA-Z0-9_]*)"
        r"(?:\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*))?",
        sql,
        re.IGNORECASE,
    )

    for table, alias in table_matches:

        # Check actual table exists
        if table not in schema:
            return False, f"Table '{table}' does not exist"

        # Map table to itself
        table_aliases[table] = table

        # If alias exists, map alias → real table
        if alias:
            # Avoid treating SQL keywords as aliases
            if alias.upper() not in {
                "ON",
                "WHERE",
                "INNER",
                "LEFT",
                "RIGHT",
                "FULL",
                "OUTER",
                "JOIN",
                "GROUP",
                "ORDER",
                "LIMIT",
                "HAVING",
            }:
                table_aliases[alias] = table

    # --------------------------------------------------
    # 2. Find qualified columns
    # Example:
    #
    # T1.name
    # T2.user_id
    # users.id
    # --------------------------------------------------

    column_matches = re.findall(
        r"\b([a-zA-Z_][a-zA-Z0-9_]*)\."
        r"([a-zA-Z_][a-zA-Z0-9_]*)\b",
        sql,
    )

    for table_or_alias, column in column_matches:

        # Resolve alias → actual table
        actual_table = table_aliases.get(table_or_alias)

        if actual_table is None:
            return False, (
                f"Table or alias '{table_or_alias}' "
                f"does not exist"
            )

        # Check column
        if column not in schema[actual_table]:
            return False, (
                f"Column '{column}' does not exist "
                f"in table '{actual_table}'"
            )

    return True, "Schema validation successful"