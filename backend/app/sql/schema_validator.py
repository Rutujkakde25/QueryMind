import re

def validate_schema(sql: str, schema: dict) -> tuple[bool, str]:
    table_aliases = {}

    table_matches = re.findall(
        r"\b(?:FROM|JOIN)\s+"
        r"([a-zA-Z_][a-zA-Z0-9_]*)"
        r"(?:\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*))?",
        sql,
        re.IGNORECASE,
    )

    for table, alias in table_matches:
        if table not in schema:
            return False, f"Table '{table}' does not exist"
        table_aliases[table] = table
        if alias and alias.upper() not in {
            "ON", "WHERE", "INNER", "LEFT", "RIGHT", "FULL",
            "OUTER", "JOIN", "GROUP", "ORDER", "LIMIT", "HAVING",
        }:
            table_aliases[alias] = table

    column_matches = re.findall(
        r"\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b", sql,
    )

    for table_or_alias, column in column_matches:
        actual_table = table_aliases.get(table_or_alias)
        if actual_table is None:
            return False, f"Table or alias '{table_or_alias}' does not exist"

        # FIX: extract actual column names from the dicts
        valid_columns = {c["name"] for c in schema[actual_table]}
        if column not in valid_columns:
            return False, f"Column '{column}' does not exist in table '{actual_table}'"

    return True, "Schema validation successful"