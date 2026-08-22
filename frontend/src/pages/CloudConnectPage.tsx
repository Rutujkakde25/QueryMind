import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectCloudDatabase, testCloudConnection } from "../lib/api";
import { useSession } from "../lib/use-session";

type Status = "idle" | "testing" | "connecting" | "success" | "error";

export default function CloudConnectPage() {
  const navigate = useNavigate();
  const { connect } = useSession();

  const [cloudUrl, setCloudUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function isReady() {
    return cloudUrl.trim().length > 0;
  }

  async function handleTest() {
    if (!isReady()) return;
    setStatus("testing");
    setMessage("");
    try {
      const res = await testCloudConnection(cloudUrl.trim());
      setStatus("success");
      setMessage(`Connection OK — found ${res.table_count} table${res.table_count === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Couldn't reach that database.");
    }
  }

  async function handleConnect() {
    if (!isReady()) return;
    setStatus("connecting");
    setMessage("");
    try {
      const res = await connectCloudDatabase(cloudUrl.trim());
      connect({ mode: "cloud", dbUrl: cloudUrl.trim() }, res);
      navigate("/app");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Couldn't connect to that database.");
    }
  }

  const busy = status === "testing" || status === "connecting";

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
        connect · <span className="text-amber">cloud</span>
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
        Cloud database.
      </h1>

      <div className="console-card mt-6 w-full p-6">
        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-mute">Connection URL</span>
            <input
              value={cloudUrl}
              onChange={(e) => setCloudUrl(e.target.value)}
              placeholder="postgresql://user:pass@host:5432/dbname"
              spellCheck={false}
              className="field font-mono text-[13px]"
            />
          </label>
        </div>

        {message && (
          <div
            role={status === "error" ? "alert" : "status"}
            className={`mt-4 rounded-lg border px-3.5 py-2.5 font-mono text-[12.5px] ${
              status === "success"
                ? "border-amber/40 bg-amber/10 text-amber"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <button onClick={handleTest} disabled={!isReady() || busy} className="btn btn-ghost flex-1">
            {status === "testing" ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-amber" />
                Testing…
              </>
            ) : (
              "Test Connection"
            )}
          </button>
          <button
            onClick={handleConnect}
            disabled={!isReady() || busy}
            className="btn btn-primary flex-1"
          >
            {status === "connecting" ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-current" />
                Connecting…
              </>
            ) : (
              "Connect Database"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
