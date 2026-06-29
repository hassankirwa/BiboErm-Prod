"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteMeasurementFormData } from "@/lib/measurements/types";

type MeasurementFormHeaderProps = {
  form: SiteMeasurementFormData;
  readOnly: boolean;
  onChange: (patch: Partial<SiteMeasurementFormData>) => void;
};

export function MeasurementFormHeader({
  form,
  readOnly,
  onChange,
}: MeasurementFormHeaderProps) {
  const fields: Array<{
    key: keyof SiteMeasurementFormData;
    label: string;
    type?: string;
  }> = [
    { key: "client_name", label: "Client name" },
    { key: "project_name", label: "Project name" },
    { key: "measured_at", label: "Date", type: "date" },
    { key: "project_address", label: "Project address" },
    { key: "client_contact", label: "Client contact" },
    { key: "phone", label: "Phone" },
    { key: "site_rep", label: "Site rep" },
    { key: "architect_designer", label: "Architect / designer" },
    { key: "main_contractor", label: "Main contractor" },
    { key: "measured_by", label: "Measured by" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ key, label, type }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          {readOnly ? (
            <p className="min-h-9 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {(form[key] as string | null | undefined) || "—"}
            </p>
          ) : (
            <Input
              id={key}
              type={type ?? "text"}
              value={(form[key] as string | null | undefined) ?? ""}
              onChange={(event) =>
                onChange({ [key]: event.target.value } as Partial<SiteMeasurementFormData>)
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
