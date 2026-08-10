type SegmentedControlOption<T extends string | number> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string | number> = {
  options: SegmentedControlOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  size?: "sm" | "md";
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  size = "md",
}: SegmentedControlProps<T>) {
  const heightClass = size === "sm" ? "min-h-10 text-xs" : "min-h-12 text-sm";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 5)}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${heightClass} ${
              isSelected
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
