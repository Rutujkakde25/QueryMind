import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  connectLocalDatabase,
  getAgentStatus,
  requestPairingCode,
} from "../lib/api";
import { useSession } from "../lib/use-session";

// Files produced by .github/workflows/build-agent.yml and attached to a release.
const RELEASE_BASE: string =
  import.meta.env.VITE_AGENT_RELEASE_URL ??
  "https://github.com/Rutujkakde25/QueryMind/releases/download/agent-v0.1.0-dev.1";

const DOWNLOADS = {
  windows: { label: "Windows", file: "AskDB-Agent-windows.exe" },
  mac: { label: "macOS", file: "AskDB-Agent-mac" },
  linux: { label: "Linux", file: "AskDB-Agent-linux" },
} as const;

type OS = keyof typeof DOWNLOADS;

// Backend expires unused pairing codes after 10 minutes; stop a little early.
const CODE_TTL_MS = 9 * 60 * 1000;

type Phase = "preparing" | "waiting" | "loading" | "error" | "expired";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  return "linux";
}

function downloadUrl(os: OS) {
  return `${RELEASE_BASE}/${DOWNLOADS[os].file}`;
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

  const [os] = useState<OS>(detectOS);
  const [pairingCode, setPairingCode] = useState("");
  const [session, setSession] = useState("");
  const [phase, setPhase] = useState<Phase>("preparing");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const codeCreatedAt = useRef(0);

  // --- pairing code: created silently, the user never has to ask for it ---

  const fetchCode = useCallback(async () => {
    try {
      const res = await requestPairingCode();
      codeCreatedAt.current = Date.now();
      setPairingCode(res.pairing_code);
      setPhase("waiting");
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Couldn't reach AskDB. Try again.");
    }
  }, []);

  useEffect(() => {
    void fetchCode();
  }, [fetchCode]);

  function handleNewCode() {
    setSession("");
    setMessage("");
    setPhase("preparing");
    void fetchCode();
  }

  // --- once the agent has paired, read the schema and go straight in ---

  const finishConnect = useCallback(
    async (sessionToken: string) => {
      setPhase("loading");
      setMessage("");
      try {
        const info = await connectLocalDatabase(sessionToken);
        connect({ mode: "local", pairingCode: sessionToken }, info);
        navigate("/app");
      } catch (err) {
        setPhase("error");
        setMessage(err instanceof Error ? err.message : "Couldn't read your database.");
      }
    },
    [connect, navigate]
  );

  useEffect(() => {
    if (phase !== "waiting" || !pairingCode) return;

    const id = setInterval(async () => {
      if (Date.now() - codeCreatedAt.current > CODE_TTL_MS) {
        clearInterval(id);
        setPhase("expired");
        return;
      }
      try {
        const res = await getAgentStatus(pairingCode);
        if (res.connected && res.session) {
          clearInterval(id);
          setSession(res.session);
          void finishConnect(res.session);
        }
      } catch {
        // transient network error — keep polling
      }
    }, 2000);

    return () => clearInterval(id);
  }, [phase, pairingCode, finishConnect]);

  // --- actions ---

  // Runs inside the click, so the browser allows the clipboard write.
  // The agent reads this on launch and pre-fills the pairing code.
  function handleDownloadClick() {
    navigator.clipboard?.writeText(pairingCode).catch(() => {});
  }

  function handleCopyCode() {
    navigator.clipboard
      ?.writeText(pairingCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  const others = (Object.keys(DOWNLOADS) as OS[]).filter((k) => k !== os);
  const paired = phase === "loading";

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
      <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
        connect · <span className="text-amber">local</span>
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
        Local database.
      </h1>
      <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-mute">
        A small app runs next to your database and relays read-only queries over one outbound
        connection. Nothing to install into your database, no ports to open.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {/* ------------------------- STEP 1 · download ------------------------- */}
        <section className="console-card p-6">
          <StepHeading step={1} title="Download the AskDB Agent" done={paired} />

          {pairingCode ? (
            <a
              href={downloadUrl(os)}
              download
              onClick={handleDownloadClick}
              className="btn btn-primary mt-5 w-full sm:w-auto"
            >
              Download for {DOWNLOADS[os].label}
            </a>
          ) : (
            <button disabled className="btn btn-primary mt-5 w-full sm:w-auto">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-current" />
              Preparing…
            </button>
          )}

          {pairingCode && (
            <p className="mt-2.5 font-mono text-[11.5px] text-mute">
              Other platforms:{" "}
              {others.map((k, i) => (
                <span key={k}>
                  {i > 0 && " · "}
                  <a
                    href={downloadUrl(k)}
                    download
                    onClick={handleDownloadClick}
                    className="underline hover:text-ink"
                  >
                    {DOWNLOADS[k].label}
                  </a>
                </span>
              ))}
            </p>
          )}
        </section>

        {/* ------------------- STEP 2 · open + enter details ------------------- */}
        <section className={`console-card p-6 ${phase === "preparing" ? "opacity-60" : ""}`}>
          <StepHeading step={2} title="Open it and enter your database details" done={paired} />
          <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
            The pairing code fills in by itself. Type your database details into the agent and
            press <span className="font-medium text-ink">Connect</span> — this page continues
            automatically.
          </p>

          <div className="mt-4 flex items-center gap-2 font-mono text-[12.5px]">
            {phase === "waiting" && (
              <>
                <span className="h-2 w-2 animate-pulseDot rounded-full bg-amber" />
                <span className="text-mute">Waiting for the agent…</span>
              </>
            )}
            {phase === "loading" && (
              <>
                <span className="h-2 w-2 animate-pulseDot rounded-full bg-[#1d9e75]" />
                <span className="text-ink">Agent connected — reading your tables…</span>
              </>
            )}
          </div>

          {phase === "expired" && (
            <div className="mt-4 flex flex-col items-start gap-3">
              <p className="text-[13px] text-mute">
                This pairing code expired. Get a new one and download again.
              </p>
              <button onClick={handleNewCode} className="btn btn-primary">
                Get a new code
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="mt-4 flex flex-col items-start gap-3">
              <div
                role="alert"
                className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 font-mono text-[12.5px] text-danger"
              >
                {message}
              </div>
              {session ? (
                <button onClick={() => void finishConnect(session)} className="btn btn-primary">
                  Try again
                </button>
              ) : (
                <button onClick={handleNewCode} className="btn btn-primary">
                  Try again
                </button>
              )}
            </div>
          )}

          {pairingCode && phase === "waiting" && (
            <details className="mt-4 text-[13px] text-mute">
              <summary className="cursor-pointer select-none hover:text-ink">
                Pairing code didn't fill in?
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[15px] font-bold tracking-wider text-amber">
                  {pairingCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-ghost !px-3 !py-1.5 font-mono !text-[12px]"
                >
                  {copied ? "copied" : "copy"}
                </button>
              </div>
              <p className="mt-2 text-[12px]">Paste it into the “Pairing code” field in the agent.</p>
            </details>
          )}
        </section>

        {/* ----------------------------- trust card ----------------------------- */}
        <section className="rounded-xl border border-line bg-bone px-5 py-4 text-[13px] leading-relaxed text-mute">
          <p className="font-medium text-ink">What AskDB can and can't see</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your database password stays on your computer — it never reaches our servers.</li>
            <li>We receive your table structure and the results of the questions you ask.</li>
            <li>Queries are read-only and capped at 1,000 rows.</li>
            <li>Close the agent any time to disconnect.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}