import { useState } from "react";
import type { ColumnInfo } from "../../lib/types";
import { useSession } from "../../lib/use-session";

function tableIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("user") || lower.includes("employee") || lower.includes("customer")) {
    return (
      <path d="M8 8a2.6 2.6 0 100-5.2A2.6 2.6 0 008 8zM2.8 13.4c0-2.4 2.3-4.2 5.2-4.2s5.2 1.8 5.2 4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    );
  }
  if (
    lower.includes("sale") ||
    lower.includes("order") ||
    lower.includes("payment") ||
    lower.includes("invoice")
  ) {
    return (
      <path d="M2.6 13.4h10.8M4.6 13.4V8.6M8 13.4V5.6M11.4 13.4V3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    );
  }
  return (
    <>
      <ellipse cx="8" cy="4" rx="4.6" ry="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.4 4v8c0 .9 2.1 1.6 4.6 1.6s4.6-.7 4.6-1.6V4" stroke="currentColor" strokeWidth="1.2" />
    </>
  );
}

function columnSummary(cols: ColumnInfo[]): string {
  const text = cols.slice(0, 4).map((c) => c.name).join(", ");
  const more = cols.length > 4 ? ` +${cols.length - 4}` : "";
  return `(${cols.length}) ${text}${more}`;
}

export default function TablePicker() {
  const { mode, dbUrl, connectInfo, allowedTables, setAllowedTables } =
    useSession();

  const tables = connectInfo?.tables ?? [];
  const schema = connectInfo?.schema ?? {};
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(allowedTables.length > 0 ? allowedTables : tables)
  );

  const targetLabel =
    mode === "local"
      ? "local · agent"
      : dbUrl.split("@").pop();

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="flex items-center gap-2 font-mono text-[11.5px] text-mute">
        <span className="text-amber">scope</span>
        <span className="text-rail">/</span>
        <span className="truncate">{targetLabel}</span>
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Choose what the AI can see
      </h1>
      <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-mute">
        Turn off any table with sensitive data. The AI only sees the tables you leave on —
        it will never read or reference the rest.
      </p>

      <div className="mt-6 flex items-center justify-between font-mono text-[12.5px] text-mute">
        <span>
          {selected.size} of {tables.length} tables on
        </span>
        <div className="flex gap-4">
          <button
            onClick={() => setSelected(new Set(tables))}
            className="text-mute transition hover:text-ink hover:underline"
          >
            select all
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="transition hover:text-ink hover:underline"
          >
            none
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {tables.map((name) => {
          const on = selected.has(name);
          const cols = schema[name] ?? [];
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              aria-pressed={on}
              className={`group flex flex-col gap-2 rounded-xl border px-4 py-3.5 text-left transition-all ${
                on
                  ? "border-ink/60 bg-panel2"
                  : "border-line bg-panel hover:border-mute/60"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    on ? "bg-ink text-bone" : "bg-panel2 text-mute"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    {tableIcon(name)}
                  </svg>
                </span>
                <span className="truncate font-mono text-[13px] font-medium text-ink">
                  {name}
                </span>
                <span
                  className={`relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors ${
                    on ? "bg-ink" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      on ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </span>
              <span className="truncate font-mono text-[11px] text-mute">
                {columnSummary(cols)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setAllowedTables(Array.from(selected))}
        disabled={selected.size === 0}
        className="btn btn-primary mt-7 w-full sm:w-auto"
      >
        Continue with {selected.size} table{selected.size === 1 ? "" : "s"}
      </button>
    </div>
  );
}