interface ClarificationCardProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
}

export default function ClarificationCard({
  question,
  options,
  onSelect,
}: ClarificationCardProps) {
  return (
    <div className="max-w-lg overflow-hidden rounded-xl border border-line/40 bg-panel">
      <div className="flex items-start gap-2.5 px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel2/15 font-mono text-[11px] font-bold text-ink">
          ?
        </span>
        <p className="text-[13.5px] leading-relaxed text-ink">{question}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line/20 px-4 py-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="rounded-full border border-line bg-panel2 px-3 py-1.5 font-mono text-[12px] text-ink transition hover:border-line/60 hover:bg-panel2/10 hover:text-ink"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
