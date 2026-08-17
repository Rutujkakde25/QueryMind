export interface SqlToken {
  cls: string;
  text: string;
}

const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS ON AS AND OR NOT IN IS NULL " +
    "GROUP BY ORDER HAVING LIMIT OFFSET DISTINCT INSERT INTO UPDATE DELETE SET VALUES " +
    "CASE WHEN THEN ELSE END UNION ALL OVER PARTITION WINDOW BETWEEN EXISTS LIKE ILIKE " +
    "ASC DESC WITH WITHIN RETURNING ON CONFLICT USING NATURAL CAST"
  ).split(/\s+/)
);

const FUNCTIONS = new Set(
  (
    "SUM COUNT AVG MIN MAX ROUND COALESCE NULLIF CONCAT LOWER UPPER TRIM LENGTH ABS NOW " +
    "CURRENT_DATE CURRENT_TIMESTAMP DATE_TRUNC EXTRACT RANDOM STDEV VARIANCE ROW_NUMBER"
  ).split(/\s+/)
);

export function highlightSql(sql: string): SqlToken[] {
  const re =
    /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|[A-Za-z_][A-Za-z0-9_]*|\s+|[^\sA-Za-z0-9_']/g;
  const tokens: SqlToken[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(sql)) !== null) {
    const text = match[0];
    let cls = "sql-op";

    if (text.startsWith("--") || text.startsWith("/*")) {
      cls = "sql-comment";
    } else if (text.startsWith("'")) {
      cls = "sql-str";
    } else if (text.startsWith('"') || text.startsWith("`")) {
      cls = "sql-id";
    } else if (/^\d/.test(text)) {
      cls = "sql-num";
    } else if (/^[A-Za-z_]/.test(text)) {
      const upper = text.toUpperCase();
      const next = sql.slice(re.lastIndex).trimStart();
      if (next.startsWith("(") && FUNCTIONS.has(upper)) cls = "sql-fn";
      else if (KEYWORDS.has(upper)) cls = "sql-kw";
      else cls = "sql-id";
    }

    tokens.push({ cls, text });
  }

  return tokens;
}
