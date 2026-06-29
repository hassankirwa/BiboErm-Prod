"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ALUMINIUM_SERIES_OPTIONS,
  FLOOR_FINISH_OPTIONS,
  SITE_STATUS_OPTIONS,
  type SiteMeasurementFormData,
  type SiteStatus,
} from "@/lib/measurements/types";

type MeasurementFormSpecsProps = {
  form: SiteMeasurementFormData;
  readOnly: boolean;
  onChange: (patch: Partial<SiteMeasurementFormData>) => void;
};

export function MeasurementFormSpecs({
  form,
  readOnly,
  onChange,
}: MeasurementFormSpecsProps) {
  function toggleSiteStatus(status: SiteStatus, checked: boolean) {
    const current = form.site_status ?? [];
    onChange({
      site_status: checked
        ? [...current, status]
        : current.filter((item) => item !== status),
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Aluminium series</Label>
        <div className="flex flex-wrap gap-4">
          {ALUMINIUM_SERIES_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.aluminium_series === option.value}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  onChange({
                    aluminium_series: checked ? option.value : null,
                  })
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Aluminium colour</Label>
          {readOnly ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {form.aluminium_colour || "—"}
            </p>
          ) : (
            <Input
              value={form.aluminium_colour ?? ""}
              onChange={(event) => onChange({ aluminium_colour: event.target.value })}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Glass type</Label>
          {readOnly ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {form.glass_type || "—"}
            </p>
          ) : (
            <Input
              value={form.glass_type ?? ""}
              onChange={(event) => onChange({ glass_type: event.target.value })}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.mesh_required ?? false}
            disabled={readOnly}
            onCheckedChange={(checked) => onChange({ mesh_required: checked === true })}
          />
          Mesh required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.grill_required ?? false}
            disabled={readOnly}
            onCheckedChange={(checked) => onChange({ grill_required: checked === true })}
          />
          Grill required
        </label>
      </div>

      <div className="space-y-2">
        <Label>Floor finish</Label>
        <div className="flex flex-wrap gap-4">
          {FLOOR_FINISH_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.floor_finish === option.value}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  onChange({
                    floor_finish: checked ? option.value : null,
                  })
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        {form.floor_finish === "other" && !readOnly && (
          <Input
            className="mt-2 max-w-sm"
            placeholder="Specify floor finish"
            value={form.floor_finish_other ?? ""}
            onChange={(event) => onChange({ floor_finish_other: event.target.value })}
          />
        )}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <Label>Floor finish thickness (doors only, mm)</Label>
        {readOnly ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            {form.floor_finish_thickness_mm ?? "—"}
          </p>
        ) : (
          <Input
            type="number"
            min={0}
            value={form.floor_finish_thickness_mm ?? ""}
            onChange={(event) =>
              onChange({
                floor_finish_thickness_mm: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Site status</Label>
        <div className="flex flex-wrap gap-4">
          {SITE_STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={(form.site_status ?? []).includes(option.value)}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  toggleSiteStatus(option.value, checked === true)
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
