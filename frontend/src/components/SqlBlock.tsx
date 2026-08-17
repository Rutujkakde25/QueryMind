import { useMemo, useState } from "react";
import { highlightSql } from "../lib/sql";

interface SqlBlockProps {
  sql: string;
  defaultOpen?: boolean;
  compact?: boolean;
  label?: string;
}

export default function SqlBlock({
  sql,
  defaultOpen = true,
  compact = false,
  label = "view.sql",
}: SqlBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => highlightSql(sql), [sql]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-bone ${
        compact ? "border-line/70" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between border-b border-line/80 bg-panel px-3.5 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded font-mono text-[11px] tracking-wide text-mute transition hover:text-amber"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M2 2l6 6M8 2L2 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-amber">SQL</span>
          <span className="text-mute/70">{label}</span>
          {open && (
            <span className="rounded bg-amber/10 px-1.5 py-0.5 text-[10px] text-amber">
              open
            </span>
          )}
        </button>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] text-mute transition hover:text-ink"
        >
          {copied ? (
            <span className="text-amber">copied</span>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 3.5V2.6A1.6 1.6 0 006.4 1H2.6A1.6 1.6 0 001 2.6v3.8A1.6 1.6 0 002.6 8H3.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              copy
            </>
          )}
        </button>
      </div>
      {open && (
        <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed">
          <code>
            {lines.map((t, i) => (
              <span key={i} className={t.cls}>
                {t.text}
              </span>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}
