import { createContext } from "react";
import type { ConnectResponse } from "./api";

export interface SessionValue {
  dbUrl: string;
  connectInfo: ConnectResponse | null;
  allowedTables: string[];
  setAllowedTables: (tables: string[]) => void;
  connect: (url: string, info: ConnectResponse) => void;
  clear: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export interface StoredSession {
  dbUrl: string;
  connectInfo: ConnectResponse;
  allowedTables: string[];
}
