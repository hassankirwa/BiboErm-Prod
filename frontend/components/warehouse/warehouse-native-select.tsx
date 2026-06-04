"use client";

import { cn } from "@/lib/utils";

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

type Option = { value: string; label: string };

type WarehouseNativeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function WarehouseNativeSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
}: WarehouseNativeSelectProps) {
  return (
    <select
      className={cn(selectClassName, className)}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export { selectClassName };
