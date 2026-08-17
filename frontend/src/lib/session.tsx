import { useEffect, useState, type ReactNode } from "react";
import { SessionContext, type SessionValue, type StoredSession } from "./session-context";

const STORAGE_KEY = "querymind-session";

function load(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.dbUrl || !parsed.connectInfo?.tables) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(load);

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage unavailable — session just won't survive a reload
    }
  }, [session]);

  const value: SessionValue = {
    dbUrl: session?.dbUrl ?? "",
    connectInfo: session?.connectInfo ?? null,
    allowedTables: session?.allowedTables ?? [],
    setAllowedTables: (tables) =>
      setSession((prev) => (prev ? { ...prev, allowedTables: tables } : prev)),
    connect: (url, info) => setSession({ dbUrl: url, connectInfo: info, allowedTables: [] }),
    clear: () => setSession(null),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
