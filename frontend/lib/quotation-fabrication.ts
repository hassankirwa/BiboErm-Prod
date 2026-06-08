import type { ApiQuotationLine } from "@/lib/api/crm/types";
import type { FabricationItem } from "@/lib/api/projects/quotations";

export type FabricationDrawing = {
  elevation?: {
    width_mm?: number | null;
    height_mm?: number | null;
    source?: string | null;
  };
  embedded_media?: {
    status?: string;
    files?: string[];
    data_url?: string | null;
    mime_type?: string | null;
    note?: string | null;
  } | null;
};

export function getLineFabrication(line: ApiQuotationLine): FabricationItem | null {
  const metadata = line.metadata as { fabrication?: FabricationItem } | null | undefined;
  return metadata?.fabrication ?? null;
}

export function getLineAccountingDrawing(line: ApiQuotationLine): FabricationDrawing | null {
  const metadata = line.metadata as { accounting?: { drawing?: FabricationDrawing } } | null | undefined;
  return metadata?.accounting?.drawing ?? null;
}

export function getLineDrawing(line: ApiQuotationLine): FabricationDrawing | null {
  return getLineAccountingDrawing(line) ?? (getLineFabrication(line)?.drawing as FabricationDrawing | undefined) ?? null;
}

/** Resolve picture fields from line top-level props or metadata drawing media. */
export function resolveLinePictureFields(line: {
  picture_data_url?: string | null;
  metadata?: unknown;
}): { picture_data_url?: string } {
  if (typeof line.picture_data_url === "string" && line.picture_data_url.startsWith("data:")) {
    return { picture_data_url: line.picture_data_url };
  }

  const drawing = getLineDrawing(line as ApiQuotationLine);
  const dataUrl = drawing?.embedded_media?.data_url;
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
    return { picture_data_url: dataUrl };
  }

  return {};
}

export function getLineElevationImageUrl(line: ApiQuotationLine): string | null {
  return resolveLinePictureFields(line).picture_data_url ?? null;
}

export function getLineElevationDimensions(line: ApiQuotationLine): {
  width_mm: number;
  height_mm: number;
  source?: string | null;
} {
  const drawing = getLineDrawing(line);
  const elevation = drawing?.elevation;
  const fabrication = getLineFabrication(line);

  const width =
    num(elevation?.width_mm) ||
    num(fabrication?.dimensions?.width_mm) ||
    num(line.width_mm);
  const height =
    num(elevation?.height_mm) ||
    num(fabrication?.dimensions?.height_mm) ||
    num(line.height_mm);

  return {
    width_mm: width,
    height_mm: height,
    source: elevation?.source ?? fabrication?.dimensions?.source ?? null,
  };
}

export function formatDeliveryDate(
  deliveryDate?: string | null,
  deliveryDateIso?: string | null,
): string | null {
  if (deliveryDateIso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(`${deliveryDateIso}T00:00:00`));
    } catch {
      return deliveryDateIso;
    }
  }

  return deliveryDate ?? null;
}

export function num(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatMm(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
