"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SetCategory } from "@/lib/supabase/types";

type SetCategoryPickerProps = {
  value: SetCategory;
  onChange: (value: SetCategory) => void;
  disabled?: boolean;
};

const OPTIONS: { value: SetCategory; label: string }[] = [
  { value: "warmup", label: "Warm-up" },
  { value: "top_set", label: "Top set" },
  { value: "working_set", label: "Normal" },
  { value: "back_off", label: "Back-off" },
];

export function SetCategoryPicker({
  value,
  onChange,
  disabled = false,
}: SetCategoryPickerProps) {
  return (
    <SegmentedControl
      ariaLabel="Set category"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      disabled={disabled}
      size="sm"
    />
  );
}
