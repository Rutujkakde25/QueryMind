import type { ColumnInfo } from "./types";

const API_BASE_URL = "http://localhost:8000";

export interface ConnectResponse {
  success: boolean;
  tables: string[];
  table_count: number;
  relationship_count: number;
  schema: Record<string, ColumnInfo[]>;
}

export interface QueryResponse {
  success: boolean;
  question: string;
  sql: string;
  results: Record<string, unknown>[];
  row_count: number;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export async function connectDatabase(databaseUrl: string): Promise<ConnectResponse> {
  const response = await fetch(`${API_BASE_URL}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ database_url: databaseUrl }),
  });

  if (!response.ok) {
    const errorBody = await parseError(response);
    throw new Error(errorBody || `Connection failed with status ${response.status}`);
  }

  return response.json();
}

// Same endpoint as connectDatabase — there's no dedicated /test-connection
// route yet, so "Test Connection" just calls /connect without advancing the
// UI past the connect screen.
export async function testConnection(databaseUrl: string): Promise<ConnectResponse> {
  return connectDatabase(databaseUrl);
}

export async function executeQuery(
  question: string,
  databaseUrl: string,
  allowedTables?: string[]
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      database_url: databaseUrl,
      ...(allowedTables ? { allowed_tables: allowedTables } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await parseError(response);
    throw new Error(errorBody || `Query failed with status ${response.status}`);
  }

  return response.json();
}

export async function submitContact(input: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactResponse> {
  const response = await fetch(`${API_BASE_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (body?.detail && (typeof body.detail === "string" ? body.detail : body.detail.error)) ||
        `Message failed with status ${response.status}`
    );
  }

  return body;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body?.detail) {
      return typeof body.detail === "string" ? body.detail : body.detail.error;
    }
    return "";
  } catch {
    return (await response.text().catch(() => "")).slice(0, 300);
  }
}
