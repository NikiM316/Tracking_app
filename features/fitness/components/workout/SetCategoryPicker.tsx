"use client";

import { SegmentedControl } from "@/features/core/components/SegmentedControl";
import type { SetCategory } from "@/lib/supabase/types";

type SetCategoryPickerProps = {
  value: SetCategory;
  onChange: (value: SetCategory) => void;
  disabled?: boolean;
};

const BASE_OPTIONS: { value: SetCategory; label: string }[] = [
  { value: "top_set", label: "Top set" },
  { value: "working_set", label: "Normal" },
  { value: "back_off", label: "Back-off" },
];

const WARMUP_OPTION: { value: SetCategory; label: string } = {
  value: "warmup",
  label: "Warm-up",
};

export function SetCategoryPicker({
  value,
  onChange,
  disabled = false,
}: SetCategoryPickerProps) {
  // Warm-ups are generated automatically when Top set is selected, so "Warm-up"
  // is not offered as a manual choice — but it still appears when the set is
  // already a warm-up so the selected category remains visible.
  const options =
    value === "warmup" ? [WARMUP_OPTION, ...BASE_OPTIONS] : BASE_OPTIONS;

  return (
    <SegmentedControl
      ariaLabel="Set category"
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      size="sm"
    />
  );
}
