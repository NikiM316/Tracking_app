type NumberInputProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
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

  function decrement() {
    if (disabled) return;
    if (allowNull && value === null) return;
    const next = clamp(numericValue - step);
    onChange(allowNull && next === min && value === min ? null : next);
  }

  function increment() {
    if (disabled) return;
    onChange(clamp(numericValue + step));
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
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled}
          onClick={decrement}
          className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 sm:h-12 sm:w-12 sm:text-xl disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={value ?? ""}
          onChange={(event) => handleInputChange(event.target.value)}
          className="h-11 min-w-[5.5rem] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-center text-base font-semibold tabular-nums text-zinc-50 outline-none focus:border-emerald-500 sm:h-12 sm:text-lg disabled:cursor-not-allowed disabled:opacity-40"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled}
          onClick={increment}
          className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 sm:h-12 sm:w-12 sm:text-xl disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
