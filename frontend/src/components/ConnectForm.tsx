import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectDatabase, testConnection } from "../lib/api";
import { useSession } from "../lib/use-session";

type Mode = "cloud" | "local";
type Status = "idle" | "testing" | "connecting" | "success" | "error";

const ENGINES = [
  { label: "PostgreSQL", scheme: "postgresql", defaultPort: "5432" },
  { label: "MySQL", scheme: "mysql", defaultPort: "3306" },
] as const;

export default function ConnectForm() {
  const navigate = useNavigate();
  const { connect } = useSession();

  const [mode, setMode] = useState<Mode>("cloud");
  const [cloudUrl, setCloudUrl] = useState("");
  const [engine, setEngine] = useState<(typeof ENGINES)[number]>(ENGINES[0]);
  const [host, setHost] = useState("");
  const [port, setPort] = useState<string>(ENGINES[0].defaultPort);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dbName, setDbName] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function buildLocalUrl() {
    const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
    return `${engine.scheme}://${auth}${host}:${port}/${dbName}`;
  }

  function currentUrl() {
    return mode === "cloud" ? cloudUrl.trim() : buildLocalUrl();
  }

  function isReady() {
    if (mode === "cloud") return cloudUrl.trim().length > 0;
    return host.trim().length > 0 && port.trim().length > 0 && dbName.trim().length > 0;
  }

  async function handleTest() {
    if (!isReady()) return;
    setStatus("testing");
    setMessage("");
    try {
      const res = await testConnection(currentUrl());
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
      const res = await connectDatabase(currentUrl());
      connect(currentUrl(), res);
      navigate("/app");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Couldn't connect to that database.");
    }
  }

  const busy = status === "testing" || status === "connecting";
  const showUrlPreview = mode === "local" && isReady() && status === "idle";

  return (
    <div className="console-card w-full max-w-md p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Connect your database</h2>
      <p className="mt-1 text-[13px] text-mute">
        Postgres or MySQL. Then you choose exactly what the AI can see.
      </p>

      {/* cloud / local segmented toggle */}
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-line bg-bone p-1">
        {(["cloud", "local"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setStatus("idle");
              setMessage("");
            }}
            aria-pressed={mode === m}
            className={`rounded-md px-2 py-1.5 font-mono text-[12.5px] font-medium transition ${
              mode === m
                ? "bg-amber/15 text-amber"
                : "text-mute hover:bg-panel2 hover:text-ink"
            }`}
          >
            {m === "cloud" ? "cloud" : "local"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {mode === "cloud" ? (
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
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-mute">Engine</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bone p-1">
                {ENGINES.map((eng) => (
                  <button
                    key={eng.scheme}
                    onClick={() => {
                      setEngine(eng);
                      setPort(eng.defaultPort);
                    }}
                    aria-pressed={engine.scheme === eng.scheme}
                    className={`rounded-md px-2 py-1.5 text-[12.5px] font-medium transition ${
                      engine.scheme === eng.scheme
                        ? "bg-amber/15 text-amber"
                        : "text-mute hover:bg-panel2 hover:text-ink"
                    }`}
                  >
                    {eng.label}
                  </button>
                ))}
              </div>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-mute">Host</span>
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  spellCheck={false}
                  className="field font-mono text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-mute">Port</span>
                <input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  inputMode="numeric"
                  className="field font-mono text-[13px]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-mute">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  spellCheck={false}
                  className="field font-mono text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-mute">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field font-mono text-[13px]"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-mute">Database name</span>
              <input
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="app_db"
                spellCheck={false}
                className="field font-mono text-[13px]"
              />
            </label>
          </>
        )}
      </div>

      {showUrlPreview && (
        <p className="mt-3 truncate font-mono text-[11.5px] text-mute">
          <span className="text-amber">$</span> querymind connect {currentUrl()}
        </p>
      )}

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
  );
}
