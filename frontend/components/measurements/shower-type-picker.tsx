"use client";

import { Button } from "@/components/ui/button";
import {
  SHOWER_TYPE_OPTIONS,
  type ShowerType,
} from "@/lib/measurements/shower-types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type ShowerTypePickerProps = {
  value?: ShowerType | null;
  readOnly?: boolean;
  onChange: (value: ShowerType | null) => void;
};

export function ShowerTypePicker({
  value,
  readOnly = false,
  onChange,
}: ShowerTypePickerProps) {
  const selected = SHOWER_TYPE_OPTIONS.find((option) => option.value === value);

  if (selected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Shower type</p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => onChange(null)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
        <div className="rounded-md border border-primary bg-background px-3 py-2.5 ring-2 ring-primary/20">
          <p className="text-sm font-medium">{selected.label}</p>
          {!readOnly && (
            <button
              type="button"
              className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => onChange(null)}
            >
              Change type
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Shower type</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SHOWER_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-md border border-border bg-background px-2 py-2.5 text-left text-xs font-medium leading-snug transition active:scale-[0.98]",
              "hover:border-primary/50",
              readOnly && "cursor-default opacity-90",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
