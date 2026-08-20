import {
  DECIMAL_INPUT_PATTERN,
  sanitizeDecimalInput,
} from "@/features/finance/utils";

type DecimalFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function DecimalField({
  id,
  value,
  onChange,
  placeholder = "0.00",
  required = false,
  className = "",
}: DecimalFieldProps) {
  function applySanitized(raw: string) {
    const next = sanitizeDecimalInput(raw);
    if (next !== null) {
      onChange(next);
    }
  }

  return (
    <input
      id={id}
      required={required}
      type="text"
      inputMode="decimal"
      pattern={DECIMAL_INPUT_PATTERN}
      autoComplete="off"
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={(event) => applySanitized(event.target.value)}
      onBlur={(event) => applySanitized(event.target.value)}
    />
  );
}
