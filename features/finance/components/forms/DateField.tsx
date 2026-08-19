type DateFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function DateField({
  id,
  value,
  onChange,
  required = false,
  className = "",
}: DateFieldProps) {
  return (
    <div
      className={`relative flex min-h-12 w-full min-w-0 max-w-full items-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 px-3 pr-10 text-base text-zinc-50 outline-none focus-within:border-emerald-500 ${className}`}
    >
      <span className="pointer-events-none truncate">{formatDisplayDate(value)}</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3 h-4 w-4 text-zinc-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <input
        id={id}
        required={required}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
