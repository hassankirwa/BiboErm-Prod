import type { ApiMeasurementLine } from "@/lib/api/crm/types";
import type { SiteVisitMeasurementLine } from "@/lib/api/crm/site-visits";

export function resolveFieldOfficerName(
  officer: { name: string } | null | undefined,
  officerId: number | null | undefined,
  roster: { id: number; name: string }[],
): string | null {
  const fromRelation = officer?.name?.trim();
  if (fromRelation) return fromRelation;
  if (officerId == null) return null;
  return roster.find((o) => o.id === officerId)?.name ?? null;
}

export function formatSiteVisitStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function canExecuteFieldVisit(status: string | null): boolean {
  return status === "in_progress" || status === "measurements_captured";
}

export function canStartFieldVisit(status: string | null): boolean {
  return status === "scheduled" || status === "assigned";
}

export type MeasurementDraft = {
  room_area_name: string;
  width: string;
  height: string;
  quantity: string;
  material_preference: string;
  installation_notes: string;
};

export const emptyMeasurementLine = (): MeasurementDraft => ({
  room_area_name: "",
  width: "",
  height: "",
  quantity: "1",
  material_preference: "",
  installation_notes: "",
});

export function measurementLinesToDrafts(
  lines: ApiMeasurementLine[] | undefined,
): MeasurementDraft[] {
  if (!lines?.length) return [emptyMeasurementLine()];
  return lines.map((line) => ({
    room_area_name: line.room_area_name,
    width: line.width != null ? String(line.width) : "",
    height: line.height != null ? String(line.height) : "",
    quantity: line.quantity != null ? String(line.quantity) : "1",
    material_preference: line.material_preference ?? "",
    installation_notes: line.installation_notes ?? "",
  }));
}

export function formatMeasurementLineSummary(line: ApiMeasurementLine): string {
  const dims =
    line.width != null && line.height != null
      ? `${line.width} × ${line.height}`
      : line.width != null
        ? `W ${line.width}`
        : line.height != null
          ? `H ${line.height}`
          : null;
  const qty =
    line.quantity != null && Number(line.quantity) !== 1
      ? `Qty ${line.quantity}`
      : null;
  const parts = [line.room_area_name, dims, qty, line.material_preference?.trim()]
    .filter(Boolean)
    .map(String);
  return parts.join(" · ");
}

export function draftsToMeasurementPayload(
  lines: MeasurementDraft[],
): SiteVisitMeasurementLine[] {
  return lines
    .filter((line) => line.room_area_name.trim())
    .map((line, index) => ({
      room_area_name: line.room_area_name.trim(),
      width: line.width ? Number(line.width) : undefined,
      height: line.height ? Number(line.height) : undefined,
      quantity: line.quantity ? Number(line.quantity) : 1,
      material_preference: line.material_preference || undefined,
      installation_notes: line.installation_notes || undefined,
      sort_order: index,
    }));
}
