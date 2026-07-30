"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { ReactNode } from "react";

export function MeasurementSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-md border border-border p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function NumberField({
  label,
  value,
  readOnly,
  onChange,
  unit = "mm",
}: {
  label: string;
  value?: number | null;
  readOnly?: boolean;
  onChange: (value: number | null) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </Label>
      {readOnly ? (
        <p className="text-sm">{value ?? "—"}</p>
      ) : (
        <Input
          type="number"
          min={0}
          inputMode="decimal"
          className="h-10 sm:h-8"
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : null)
          }
        />
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  readOnly,
  onChange,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  readOnly?: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {readOnly ? (
        <p className="text-sm whitespace-pre-wrap">{value?.trim() || "—"}</p>
      ) : multiline ? (
        <Textarea
          rows={2}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          className="h-10 sm:h-8"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  readOnly,
  onChange,
  placeholder = "Select",
}: {
  label: string;
  value?: T | null;
  options: Array<{ value: T; label: string }>;
  readOnly?: boolean;
  onChange: (value: T | null) => void;
  placeholder?: string;
}) {
  const display =
    options.find((option) => option.value === value)?.label ?? (value || "—");

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {readOnly ? (
        <p className="text-sm">{display}</p>
      ) : (
        <Select
          value={value ?? undefined}
          onValueChange={(next) => onChange(next as T)}
        >
          <SelectTrigger className="h-10 sm:h-8">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function BoolField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value?: boolean | null;
  readOnly?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={Boolean(value)}
        disabled={readOnly}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <span>{label}</span>
    </label>
  );
}

export function CheckboxGroupField<T extends string>({
  label,
  values,
  options,
  readOnly,
  onChange,
}: {
  label: string;
  values?: T[];
  options: Array<{ value: T; label: string }>;
  readOnly?: boolean;
  onChange: (values: T[]) => void;
}) {
  const selected = values ?? [];

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                disabled={readOnly}
                onCheckedChange={(next) => {
                  if (next === true) {
                    onChange([...selected, option.value]);
                  } else {
                    onChange(selected.filter((item) => item !== option.value));
                  }
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
