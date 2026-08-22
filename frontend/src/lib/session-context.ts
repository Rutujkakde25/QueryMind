import { createContext } from "react";
import type { ConnectResponse } from "./api";

export type SessionMode = "cloud" | "local";

export interface SessionInput {
  mode: SessionMode;
  dbUrl?: string;
  pairingCode?: string;
}

export interface SessionValue {
  mode: SessionMode | null;
  dbUrl: string;
  pairingCode: string;
  connectInfo: ConnectResponse | null;
  allowedTables: string[];
  setAllowedTables: (tables: string[]) => void;
  connect: (input: SessionInput, info: ConnectResponse) => void;
  clear: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export interface StoredSession {
  mode: SessionMode;
  dbUrl?: string;
  pairingCode?: string;
  connectInfo: ConnectResponse;
  allowedTables: string[];
}
