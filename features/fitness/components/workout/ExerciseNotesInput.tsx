"use client";

type ExerciseNotesInputProps = {
  previousNote: string | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  saving?: boolean;
  justSaved?: boolean;
};

export function ExerciseNotesInput({
  previousNote,
  value,
  onChange,
  disabled = false,
  saving = false,
  justSaved = false,
}: ExerciseNotesInputProps) {
  return (
    <div className="space-y-2 border-t border-zinc-800 pt-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Notes
        </label>
        {saving ? (
          <span className="text-xs font-medium text-emerald-400">Saving…</span>
        ) : (
          <span
            aria-hidden={!justSaved}
            className={`flex items-center gap-1 text-xs font-medium text-emerald-400 transition-opacity duration-700 ${
              justSaved ? "opacity-100" : "opacity-0"
            }`}
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved
          </span>
        )}
      </div>

      {previousNote ? (
        <p className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">Last time: </span>
          {previousNote}
        </p>
      ) : null}

      <textarea
        rows={2}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Increase weight next session, focus on form…"
        className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}
