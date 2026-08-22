import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SchemaTable } from "../../lib/types";
import { useSession } from "../../lib/use-session";

interface SchemaRailProps {
  tables: SchemaTable[];
  onRescope: () => void;
}

function TableNode({ table }: { table: SchemaTable }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink transition hover:bg-panel2"
      >
        <span className="w-3 font-mono text-mute">{open ? "▾" : "▸"}</span>
        <span className="truncate font-mono font-medium">{table.name}</span>
      </button>
      {open && (
        <div className="ml-3.5 border-l border-line pl-3">
          {table.columns.map((col, i) => {
            const isLast = i === table.columns.length - 1;
            return (
              <div
                key={col.name}
                className="flex items-center gap-1.5 py-0.5 font-mono text-[12px] text-mute"
              >
                <span className="select-none text-rail">{isLast ? "└─" : "├─"}</span>
                <span className="truncate">{col.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-mute/60">{col.type}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SchemaRail({ tables, onRescope }: SchemaRailProps) {
  const navigate = useNavigate();
  const { mode, dbUrl, pairingCode, clear } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const targetLabel =
    mode === "local"
      ? `local · agent ${pairingCode.slice(0, 8)}`
      : dbUrl.split("@").pop();

  if (collapsed) {
    return (
      <div className="flex h-full w-11 shrink-0 flex-col items-center border-r border-line bg-bone py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-lg p-1.5 text-mute transition hover:bg-panel2 hover:text-ink"
          aria-label="Expand schema panel"
        >
          »
        </button>
        <div className="mt-4 h-2 w-2 rounded-full bg-amber" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-bone">
      <div className="flex items-center justify-between border-b border-line/80 px-3 py-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-mute">
          schema · scope on
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg p-1 text-mute transition hover:bg-panel2 hover:text-ink"
          aria-label="Collapse schema panel"
        >
          «
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {tables.map((t) => (
          <TableNode key={t.name} table={t} />
        ))}
      </div>

      <div className="border-t border-line/80 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ink">Connected</div>
            <div className="truncate font-mono text-[11px] text-mute">
              {targetLabel}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onRescope}
            className="btn btn-ghost flex-1 !px-2 !py-1.5 font-mono !text-[11.5px]"
          >
            change scope
          </button>
          <button
            onClick={() => {
              clear();
              navigate("/");
            }}
            className="btn btn-ghost flex-1 !px-2 !py-1.5 font-mono !text-[11.5px]"
          >
            disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
