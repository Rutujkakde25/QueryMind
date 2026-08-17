export interface ColumnInfo {
  name: string;
  type: string;
}

export interface SchemaTable {
  name: string;
  columns: ColumnInfo[];
}

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "result";
      question: string;
      sql: string;
      results: Record<string, unknown>[];
      rowCount: number;
    }
  | {
      id: string;
      role: "clarification";
      question: string;
      options: string[];
    }
  | { id: string; role: "error"; text: string };
