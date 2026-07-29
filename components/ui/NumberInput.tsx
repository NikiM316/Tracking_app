type NumberInputProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onCommit?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  allowNull?: boolean;
  disabled?: boolean;
  unit?: string;
  muted?: boolean;
};

export function NumberInput({
  label,
  value,
  onChange,
  onCommit,
  min = 0,
  max = 999,
  step = 1,
  allowNull = false,
  disabled = false,
  unit,
  muted = false,
}: NumberInputProps) {
  const numericValue = value ?? 0;

  function clamp(next: number) {
    return Math.min(max, Math.max(min, next));
  }

  function commit(nextValue: number | null = value) {
    onCommit?.(nextValue);
  }

  function decrement() {
    if (disabled) return;
    if (allowNull && value === null) return;
    const next = clamp(numericValue - step);
    const nextValue = allowNull && next === min && value === min ? null : next;
    onChange(nextValue);
    commit(nextValue);
  }

  function increment() {
    if (disabled) return;
    const next = clamp(numericValue + step);
    onChange(next);
    commit(next);
  }

  function handleInputChange(raw: string) {
    if (disabled) return;
    if (raw === "" && allowNull) {
      onChange(null);
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(clamp(parsed));
  }

  return (
    <div className={`flex flex-col gap-1.5 ${muted ? "opacity-45" : ""}`}>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {unit ? ` (${unit})` : ""}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled}
          onClick={decrement}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          disabled={disabled}
          value={value ?? ""}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={() => commit(value)}
          className="h-12 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 text-center text-lg font-semibold text-zinc-50 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled}
          onClick={increment}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
