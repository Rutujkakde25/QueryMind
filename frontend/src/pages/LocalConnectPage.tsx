import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  connectLocalDatabase,
  getAgentStatus,
  requestPairingCode,
} from "../lib/api";
import { useSession } from "../lib/use-session";

const AGENT_ZIP_URL =
  "https://d38s88ui4xma4r.cloudfront.net/askdb_agent.zip";

const ENGINES = [
  { label: "PostgreSQL", value: "postgresql", defaultPort: "5432" },
  { label: "MySQL", value: "mysql", defaultPort: "3306" },
] as const;

type Engine = (typeof ENGINES)[number]["value"];
type Platform = "unix" | "windows";

const UNIX_COMMANDS = [
  "unzip askdb_agent.zip",
  "cd askdb_agent",
  "chmod +x build.sh",
  "./build.sh",
  "cd dist",
  "./AskDB-Agent",
];

const WINDOWS_COMMANDS = [
  "Expand-Archive askdb_agent.zip -DestinationPath .",
  "cd askdb_agent",
  "bash build.sh",
  "cd dist",
  ".\\AskDB-Agent.exe",
];

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      ?.writeText(command)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3.5 py-2 font-mono text-[12px] text-ink">
      <code className="overflow-x-auto whitespace-pre">{command}</code>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-md border border-line px-2 py-1 font-mono text-[10.5px] text-mute transition hover:border-mute hover:text-ink"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

function StepHeading({
  step,
  title,
  done,
}: {
  step: number;
  title: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px] font-semibold ${
          done
            ? "border-amber bg-amber/15 text-amber"
            : "border-line bg-panel text-mute"
        }`}
      >
        {done ? "✓" : step}
      </span>
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
    </div>
  );
}

export default function LocalConnectPage() {
  const navigate = useNavigate();
  const { connect } = useSession();

  // --- pairing ---
  const [pairingCode, setPairingCode] = useState("");
  const [agentConnected, setAgentConnected] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pairError, setPairError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- db details ---
  const [engine, setEngine] = useState<Engine>(ENGINES[0].value);
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState<string>(ENGINES[0].defaultPort);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dbName, setDbName] = useState("");

  const [status, setStatus] = useState<"idle" | "connecting" | "error">("idle");
  const [message, setMessage] = useState("");

  const [platform, setPlatform] = useState<Platform>(() => {
    if (typeof navigator === "undefined") return "unix";
    return navigator.userAgent.includes("Win") ? "windows" : "unix";
  });

  useEffect(() => {
    if (!pairingCode || agentConnected) return;
    let cancelled = false;

    async function check() {
      try {
        const res = await getAgentStatus(pairingCode);
        if (!cancelled && res.connected) setAgentConnected(true);
      } catch {
        // transient network error — keep polling
      }
    }

    check();
    pollRef.current = setInterval(check, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pairingCode, agentConnected]);

  async function handleGenerate() {
    setGenerating(true);
    setPairError("");
    setAgentConnected(false);
    try {
      const res = await requestPairingCode();
      setPairingCode(res.pairing_code);
    } catch (err) {
      setPairError(err instanceof Error ? err.message : "Couldn't generate a pairing code.");
    } finally {
      setGenerating(false);
    }
  }

  function isReady() {
    return host.trim().length > 0 && port.trim().length > 0 && dbName.trim().length > 0;
  }

  async function handleConnect() {
    if (!isReady() || !pairingCode || !agentConnected) return;
    setStatus("connecting");
    setMessage("");
    try {
      const res = await connectLocalDatabase(pairingCode, {
        dbType: engine,
        host: host.trim(),
        port: port.trim(),
        username,
        password,
        database: dbName.trim(),
      });
      connect({ mode: "local", pairingCode }, res);
      navigate("/app");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Couldn't connect to that database.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
      <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
        connect · <span className="text-amber">local</span>
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
        Local database.
      </h1>
      <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-mute">
        QueryMind never needs direct access to your machine. A small connector runs next to
        your database and relays queries over one outbound connection.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {/* ------------------------- STEP 1 · download ------------------------- */}
        <section className="console-card p-6">
          <StepHeading step={1} title="Download the AskDB Agent connector" />
          <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
            One zip works on Windows, macOS, and Linux. Your database password stays on
            your machine — only query results travel to the cloud.
          </p>

          <a
            href={AGENT_ZIP_URL}
            download
            className="btn btn-primary mt-5 w-full sm:w-auto"
          >
            Download AskDB Agent (.zip)
          </a>

          <p className="mt-2.5 font-mono text-[11px] text-mute">
            Requires Python 3.9+ to build the agent (one-time setup below).
          </p>
        </section>

        {/* --------------------------- STEP 2 · pair ---------------------------- */}
        <section className="console-card p-6">
          <StepHeading
            step={2}
            title="Run the agent and pair it"
            done={agentConnected}
          />
          <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
            Run these commands in order:
          </p>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-line bg-bone p-1">
            <button
              onClick={() => setPlatform("unix")}
              aria-pressed={platform === "unix"}
              className={`rounded-md px-2 py-1.5 text-[12.5px] font-medium transition ${
                platform === "unix"
                  ? "bg-amber/15 text-amber"
                  : "text-mute hover:bg-panel2 hover:text-ink"
              }`}
            >
              macOS / Linux
            </button>
            <button
              onClick={() => setPlatform("windows")}
              aria-pressed={platform === "windows"}
              className={`rounded-md px-2 py-1.5 text-[12.5px] font-medium transition ${
                platform === "windows"
                  ? "bg-amber/15 text-amber"
                  : "text-mute hover:bg-panel2 hover:text-ink"
              }`}
            >
              Windows
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {(platform === "unix" ? UNIX_COMMANDS : WINDOWS_COMMANDS).map((cmd, i) => (
              <CommandLine key={i} command={cmd} />
            ))}
          </div>

          {platform === "windows" && (
            <p className="mt-2.5 font-mono text-[11px] text-mute">
              build.sh is a bash script — run it via Git Bash or WSL. Don't have either?
              Use Git Bash's terminal for all steps above.
            </p>
          )}

          {!pairingCode ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-primary mt-5"
            >
              {generating ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-current" />
                  Generating…
                </>
              ) : (
                "Generate pairing code"
              )}
            </button>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-lg border border-line bg-panel px-4 py-2.5 font-mono text-xl font-bold tracking-[0.3em] text-amber">
                  {pairingCode.toUpperCase()}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard?.writeText(pairingCode).catch(() => {})
                  }
                  className="btn btn-ghost !px-3 !py-1.5 font-mono !text-[12px]"
                >
                  copy
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-mute">
                Paste this code into the AskDB Agent window and click{" "}
                <span className="font-medium text-ink">Connect</span> there.
              </p>
              <div className="flex items-center gap-2 font-mono text-[12.5px]">
                {agentConnected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[#1d9e75]" />
                    <span className="text-ink">Agent connected — continue below</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 animate-pulseDot rounded-full bg-amber" />
                    <span className="text-mute">Waiting for agent…</span>
                  </>
                )}
              </div>
              {pairError && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 font-mono text-[12.5px] text-danger"
                >
                  {pairError}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ------------------------ STEP 3 · db details ------------------------ */}
        <section className={`console-card p-6 ${!agentConnected ? "opacity-60" : ""}`}>
          <StepHeading step={3} title="Enter your database details" />
          <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
            These details are relayed straight to the agent on your machine. The cloud never
            stores them.
          </p>

          <div className="mt-5 flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-mute">Engine</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bone p-1">
                {ENGINES.map((eng) => (
                  <button
                    key={eng.value}
                    onClick={() => {
                      setEngine(eng.value);
                      setPort(eng.defaultPort);
                    }}
                    aria-pressed={engine === eng.value}
                    className={`rounded-md px-2 py-1.5 text-[12.5px] font-medium transition ${
                      engine === eng.value
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
                  disabled={!agentConnected}
                  className="field font-mono text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-mute">Port</span>
                <input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  inputMode="numeric"
                  disabled={!agentConnected}
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
                  disabled={!agentConnected}
                  className="field font-mono text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-mute">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!agentConnected}
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
                disabled={!agentConnected}
                className="field font-mono text-[13px]"
              />
            </label>
          </div>

          {message && status === "error" && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 font-mono text-[12.5px] text-danger"
            >
              {message}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={!agentConnected || !isReady() || status === "connecting"}
            className="btn btn-primary mt-5 w-full sm:w-auto"
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
          {!agentConnected && (
            <p className="mt-2.5 font-mono text-[11.5px] text-mute">
              Unlocks once the agent pairs above.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}