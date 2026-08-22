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

export interface PairingCodeResponse {
  pairing_code: string;
}

export interface AgentStatusResponse {
  connected: boolean;
}

export interface LocalDbFields {
  dbType: "postgresql" | "mysql";
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
}

// ---------------------------------------------------------------------------
// Cloud path — direct database_url, backend connects straight to the DB.
// ---------------------------------------------------------------------------

export async function connectCloudDatabase(databaseUrl: string): Promise<ConnectResponse> {
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

export async function testCloudConnection(databaseUrl: string): Promise<ConnectResponse> {
  // No dedicated /test-connection route — reuse /connect, don't advance the UI.
  return connectCloudDatabase(databaseUrl);
}

export async function executeCloudQuery(
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

// ---------------------------------------------------------------------------
// Local path — relayed through a paired agent over WebSocket. No direct
// reachability to the user's database is required from the backend.
// ---------------------------------------------------------------------------

export async function requestPairingCode(): Promise<PairingCodeResponse> {
  const response = await fetch(`${API_BASE_URL}/agent/pair`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to generate a pairing code (status ${response.status})`);
  }
  return response.json();
}

export async function getAgentStatus(pairingCode: string): Promise<AgentStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/agent/status/${pairingCode}`);
  if (!response.ok) {
    throw new Error(`Failed to check agent status (status ${response.status})`);
  }
  return response.json();
}

/**
 * Polls agent status until the agent connects or the timeout elapses.
 * Use after showing the pairing code, while the user launches/pastes it
 * into the AskDB Agent app.
 */
export async function waitForAgentConnection(
  pairingCode: string,
  { intervalMs = 2000, timeoutMs = 120000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { connected } = await getAgentStatus(pairingCode);
    if (connected) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export async function connectLocalDatabase(
  pairingCode: string,
  fields: LocalDbFields
): Promise<ConnectResponse> {
  const response = await fetch(`${API_BASE_URL}/connect/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairing_code: pairingCode,
      db_type: fields.dbType,
      host: fields.host,
      port: fields.port,
      username: fields.username,
      password: fields.password,
      database: fields.database,
    }),
  });

  if (!response.ok) {
    const errorBody = await parseError(response);
    throw new Error(errorBody || `Connection failed with status ${response.status}`);
  }

  return response.json();
}

export async function executeLocalQuery(
  pairingCode: string,
  question: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/query/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairing_code: pairingCode,
      question,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    const errorBody = await parseError(response);
    throw new Error(errorBody || `Query failed with status ${response.status}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------

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
