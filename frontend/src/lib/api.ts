import type { ColumnInfo } from "./types";

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface ConnectResponse {
  success: boolean;
  tables: string[];
  table_count: number;
  relationship_count: number;
  schema: Record<string, ColumnInfo[]>;
}

export interface QueryResultResponse {
  success: boolean;
  type: "result";
  question: string;
  sql: string;
  results: Record<string, unknown>[];
  row_count: number;
}

export interface QueryClarificationResponse {
  success: boolean;
  type: "clarification";
  question: string;
  message: string;
  options: string[];
}

export type QueryResponse = QueryResultResponse | QueryClarificationResponse;

export interface ContactResponse {
  success: boolean;
  message: string;
}

export interface PairingCodeResponse {
  pairing_code: string;
}

export interface AgentStatusResponse {
  connected: boolean;
  // Session token — returned exactly once, right after the agent pairs.
  session: string | null;
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
 * Polls agent status until the agent pairs or the timeout elapses.
 * Resolves with the session token, or null on timeout.
 */
export async function waitForAgentSession(
  pairingCode: string,
  { intervalMs = 2000, timeoutMs = 600000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { connected, session } = await getAgentStatus(pairingCode);
    if (connected && session) return session;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

/**
 * Fetches the schema through the paired agent. No credentials are sent —
 * the agent already holds them on the user's machine.
 */
export async function connectLocalDatabase(session: string): Promise<ConnectResponse> {
  const response = await fetch(`${API_BASE_URL}/connect/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairing_code: session }),
  });

  if (!response.ok) {
    const errorBody = await parseError(response);
    throw new Error(errorBody || `Connection failed with status ${response.status}`);
  }

  return response.json();
}

export async function executeLocalQuery(
  session: string,
  question: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/query/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairing_code: session,
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