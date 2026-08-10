const API_BASE_URL = "http://localhost:8000";

export interface ConnectResponse {
  success: boolean;
  tables: string[];
  table_count: number;
  relationship_count: number;
}

export interface QueryResponse {
  success: boolean;
  question: string;
  sql: string;
  results: Record<string, unknown>[];
  row_count: number;
}

export async function connectDatabase(
  databaseUrl: string
): Promise<ConnectResponse> {
  const response = await fetch(`${API_BASE_URL}/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      database_url: databaseUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail?.error || "Failed to connect to database"
    );
  }

  return data;
}

export async function executeQuery(
  question: string,
  databaseUrl: string
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      database_url: databaseUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail?.error || "Failed to execute query"
    );
  }

  return data;
}