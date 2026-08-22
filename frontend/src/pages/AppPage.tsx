import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { executeCloudQuery, executeLocalQuery } from "../lib/api";
import { useSession } from "../lib/use-session";
import type { ChatMessage, SchemaTable } from "../lib/types";
import TablePicker from "../components/workbench/TablePicker";
import SchemaRail from "../components/workbench/SchemaRail";
import DataTable from "../components/workbench/DataTable";
import ClarificationCard from "../components/workbench/ClarificationCard";
import ChatInput from "../components/workbench/ChatInput";
import SqlBlock from "../components/SqlBlock";

let idCounter = 0;
const nextId = () => `msg-${idCounter++}`;

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
          no session
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
          Connect a database first.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-mute">
          The console needs a live database. Head back to the landing page, connect, and
          choose your scope.
        </p>
        <Link to="/" className="btn btn-primary mt-6">
          Connect a database
        </Link>
      </div>
    </div>
  );
}

export default function AppPage() {
  const { mode, dbUrl, pairingCode, connectInfo, allowedTables, setAllowedTables } =
    useSession();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const sessionReady =
    !!connectInfo && (mode === "cloud" ? !!dbUrl : mode === "local" ? !!pairingCode : false);

  if (!sessionReady) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
        <EmptyState />
      </div>
    );
  }

  const phase: "scope" | "chat" = allowedTables.length > 0 ? "chat" : "scope";

  if (phase === "scope") {
    return (
      <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto">
        <TablePicker />
      </div>
    );
  }

  const schema: SchemaTable[] = allowedTables
    .map((name) => ({
      name,
      columns: connectInfo.schema?.[name] ?? [],
    }))
    .filter((t) => t.columns.length > 0 || true);

  async function runQuery(question: string) {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: question }]);

    setLoading(true);
    try {
      const res =
        mode === "local"
          ? await executeLocalQuery(pairingCode, question)
          : await executeCloudQuery(question, dbUrl, allowedTables);

      if (res.type === "clarification") {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "clarification",
            question: res.message,
            options: res.options ?? [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "result",
            question: res.question,
            sql: res.sql,
            results: res.results,
            rowCount: res.row_count,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "error",
          text: err instanceof Error ? err.message : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resolveClarification(option: string) {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: `→ ${option}` }]);
    runQuery(option);
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Rail — desktop */}
      <div className="hidden shrink-0 lg:block">
        <SchemaRail tables={schema} onRescope={() => setAllowedTables([])} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile scope bar */}
        <div className="flex items-center justify-between border-b border-line/80 bg-panel px-4 py-2 lg:hidden">
          <span className="font-mono text-[11.5px] text-mute">
            <span className="text-amber">scope on</span> · {allowedTables.length} table
            {allowedTables.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => setAllowedTables([])}
            className="font-mono text-[11.5px] text-amber transition hover:underline"
          >
            change scope
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.map((m) => {
              switch (m.role) {
                case "user":
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-lg rounded-xl rounded-br-md border border-line bg-amber/10 px-4 py-2.5 text-[13.5px] leading-relaxed text-ink">
                        {m.text}
                      </div>
                    </div>
                  );
                case "result":
                  return (
                    <div key={m.id} className="flex flex-col gap-3">
                      <DataTable
                        question={m.question}
                        results={m.results}
                        rowCount={m.rowCount}
                      />
                      <SqlBlock sql={m.sql} defaultOpen={false} compact label={`answer_${m.id}.sql`} />
                    </div>
                  );
                case "clarification":
                  return (
                    <ClarificationCard
                      key={m.id}
                      question={m.question}
                      options={m.options}
                      onSelect={resolveClarification}
                    />
                  );
                case "error":
                  return (
                    <div
                      key={m.id}
                      className="max-w-lg rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 font-mono text-[12.5px] text-danger"
                    >
                      {m.text}
                    </div>
                  );
                default:
                  return null;
              }
            })}

            {loading && (
              <div className="flex items-center gap-2 font-mono text-[12.5px] text-mute">
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-amber" />
                running query…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <ChatInput onSend={runQuery} disabled={loading} />
      </div>
    </div>
  );
}
