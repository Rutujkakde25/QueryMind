import { useMemo, useState } from "react";

interface DataTableProps {
  question: string;
  results: Record<string, unknown>[];
  rowCount: number;
  pageSize?: number;
}

export default function DataTable({
  question,
  results,
  rowCount,
  pageSize = 8,
}: DataTableProps) {
  const [page, setPage] = useState(0);

  const columns = useMemo(
    () => (results.length > 0 ? Object.keys(results[0]) : []),
    [results]
  );

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const start = page * pageSize;
  const pageRows = results.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/80 px-4 py-2.5">
        <span className="font-mono text-[12px] text-mute">
          <span className="font-semibold text-amber">{rowCount}</span> row
          {rowCount === 1 ? "" : "s"} · &ldquo;{question}&rdquo;
        </span>
      </div>

      {results.length === 0 ? (
        <div className="px-4 py-8 text-center font-mono text-[12.5px] text-mute">
          SELECT returned no rows.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line/80">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-mute"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={start + i} className="border-b border-line/50 last:border-0 hover:bg-panel2">
                  {columns.map((col) => (
                    <td key={col} className="whitespace-nowrap px-4 py-2 text-ink">
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line/80 px-4 py-2 font-mono text-[12px] text-mute">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded px-2 py-1 transition hover:bg-panel2 hover:text-ink disabled:opacity-30"
          >
            ← prev
          </button>
          <span>
            page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded px-2 py-1 transition hover:bg-panel2 hover:text-ink disabled:opacity-30"
          >
            next →
          </button>
        </div>
      )}
    </div>
  );
}
