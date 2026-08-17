import { useState, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line/80 bg-bone px-4 pb-4 pt-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 transition focus-within:border-amber focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--amber)_18%,transparent)]">
          <span className="mb-2 shrink-0 select-none font-mono text-[13px] text-mute">
            &gt;
          </span>
          <textarea
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your database anything…"
            disabled={disabled}
            className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed text-ink placeholder:text-mute focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber text-on-amber transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2 8h11.5M8.5 2.5L14 8l-5.5 5.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[11px] text-mute">
          Enter to run · shift+enter for a new line · only the tables in your scope are visible
        </p>
      </div>
    </div>
  );
}
