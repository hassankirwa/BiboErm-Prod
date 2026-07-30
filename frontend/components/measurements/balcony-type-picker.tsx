"use client";

import { Button } from "@/components/ui/button";
import {
  BALCONY_TYPE_OPTIONS,
  type BalconyType,
} from "@/lib/measurements/balcony-types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type BalconyTypePickerProps = {
  value?: BalconyType | null;
  readOnly?: boolean;
  onChange: (value: BalconyType | null) => void;
};

export function BalconyTypePicker({
  value,
  readOnly = false,
  onChange,
}: BalconyTypePickerProps) {
  const selected = BALCONY_TYPE_OPTIONS.find((option) => option.value === value);

  if (selected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Balcony type</p>
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
        <div className="flex gap-3 overflow-hidden rounded-md border border-primary bg-background ring-2 ring-primary/20">
          <div className="relative h-20 w-28 shrink-0 bg-muted/40 sm:h-24 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.image}
              alt={selected.label}
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="min-w-0 flex-1 py-2 pr-2">
            <p className="text-sm font-medium leading-snug">{selected.label}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:line-clamp-3">
              {selected.description}
            </p>
            {!readOnly && (
              <button
                type="button"
                className="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => onChange(null)}
              >
                Change design
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-medium">Balcony type</p>
        <p className="text-xs text-muted-foreground">
          Door is at the top (building face) — not a wall. Walls are full-height
          left/right only. Open sides have a low barricade; measure open height
          above it.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {BALCONY_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col overflow-hidden rounded-md border border-border bg-background text-left transition active:scale-[0.98]",
              "hover:border-primary/50",
              readOnly && "cursor-default opacity-90",
            )}
          >
            <div className="relative aspect-[4/3] bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.image}
                alt={option.label}
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div className="border-t border-border px-1.5 py-1.5 sm:px-2 sm:py-2">
              <div className="text-[11px] font-medium leading-snug sm:text-xs">
                {option.label}
              </div>
              <p className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground sm:line-clamp-2 sm:block">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
