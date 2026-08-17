import { useContext } from "react";
import { SessionContext, type SessionValue } from "./session-context";

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
