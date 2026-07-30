import type { BalconyMeasurementDetails } from "@/lib/measurements/balcony-types";
import { hasBalconyDetailsData } from "@/lib/measurements/balcony-types";
import type { ShowerMeasurementDetails } from "@/lib/measurements/shower-types";
import { hasShowerDetailsData } from "@/lib/measurements/shower-types";

export type { BalconyMeasurementDetails } from "@/lib/measurements/balcony-types";
export type { ShowerMeasurementDetails } from "@/lib/measurements/shower-types";

export type MeasurementContext = "quotation" | "production";

export type MeasurementFormStatus = "draft" | "submitted" | "approved" | "locked";

export type AluminiumSeries = "standard" | "premium" | "executive";

export type FloorFinish = "tile" | "spc" | "wood" | "marble" | "other";

export type SiteStatus =
  | "masonry"
  | "plastered"
  | "screeded"
  | "tiled"
  | "painted"
  | "occupied";

export type MeasurementProductType =
  | "Door"
  | "Window"
  | "Balcony"
  | "Bathroom";

export type SiteMeasurementLine = {
  ref?: string | null;
  unit_floor?: string | null;
  room_location?: string | null;
  product_type?: MeasurementProductType | null;
  quantity?: number;
  width_top_mm?: number | null;
  width_centre_mm?: number | null;
  width_bottom_mm?: number | null;
  height_left_mm?: number | null;
  height_centre_mm?: number | null;
  height_right_mm?: number | null;
  wall_height_mm?: number | null;
  wall_thickness_mm?: number | null;
  photo_refs?: number[];
  remarks?: string | null;
  sort_order?: number;
  balcony_details?: BalconyMeasurementDetails | null;
  shower_details?: ShowerMeasurementDetails | null;
};

export type SiteMeasurementFormData = {
  client_name?: string | null;
  project_name?: string | null;
  measured_at?: string | null;
  project_address?: string | null;
  client_contact?: string | null;
  phone?: string | null;
  site_rep?: string | null;
  architect_designer?: string | null;
  main_contractor?: string | null;
  measured_by?: string | null;
  aluminium_series?: AluminiumSeries | null;
  aluminium_colour?: string | null;
  glass_type?: string | null;
  mesh_required?: boolean;
  grill_required?: boolean;
  floor_finish?: FloorFinish | null;
  floor_finish_other?: string | null;
  floor_finish_thickness_mm?: number | null;
  site_status?: SiteStatus[];
  lines: SiteMeasurementLine[];
  operational_notes?: string | null;
};

export const SITE_STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
  { value: "masonry", label: "Masonry" },
  { value: "plastered", label: "Plastered" },
  { value: "screeded", label: "Screeded" },
  { value: "tiled", label: "Tiled" },
  { value: "painted", label: "Painted" },
  { value: "occupied", label: "Occupied" },
];

export const MEASUREMENT_PRODUCT_TYPE_OPTIONS: {
  value: MeasurementProductType;
  label: string;
}[] = [
  { value: "Door", label: "Door" },
  { value: "Window", label: "Window" },
  { value: "Balcony", label: "Balcony" },
  { value: "Bathroom", label: "Shower Enclosure" },
];

export function normalizeMeasurementProductType(
  value?: string | null,
): MeasurementProductType | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (normalized.includes("bathroom") || normalized.includes("shower")) {
    return "Bathroom";
  }
  if (normalized.includes("balcony") || normalized.includes("balustrade")) {
    return "Balcony";
  }
  if (normalized.includes("door")) return "Door";
  if (normalized.includes("window") || normalized.includes("win")) {
    return "Window";
  }
  return null;
}

export const ALUMINIUM_SERIES_OPTIONS: { value: AluminiumSeries; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "executive", label: "Executive" },
];

export const FLOOR_FINISH_OPTIONS: { value: FloorFinish; label: string }[] = [
  { value: "tile", label: "Tile" },
  { value: "spc", label: "SPC" },
  { value: "wood", label: "Wood" },
  { value: "marble", label: "Marble" },
  { value: "other", label: "Other" },
];

export const GLASS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "Single Strength Glass", label: "Single Strength Glass" },
  { value: "Double Strength Glass", label: "Double Strength Glass" },
  { value: "Thicker Glass Options", label: "Thicker Glass Options" },
  { value: "Laminated Glass", label: "Laminated Glass" },
  { value: "Tempered Glass", label: "Tempered Glass" },
  { value: "Low-E Glass", label: "Low-E Glass" },
  { value: "other", label: "Other" },
];

export const GLASS_TYPE_CUSTOM_VALUE = "other" as const;

export function glassTypeLabel(value?: string | null): string {
  if (!value?.trim()) return "—";
  const match = GLASS_TYPE_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export function isKnownGlassType(value?: string | null): boolean {
  if (!value) return false;
  return GLASS_TYPE_OPTIONS.some(
    (option) => option.value === value && option.value !== GLASS_TYPE_CUSTOM_VALUE,
  );
}

export function resolveGlassTypeSelectValue(value?: string | null): string {
  if (!value?.trim()) return "";
  if (isKnownGlassType(value)) return value;
  return GLASS_TYPE_CUSTOM_VALUE;
}
export function emptyMeasurementLine(sortOrder = 0): SiteMeasurementLine {
  return {
    ref: "",
    unit_floor: "",
    room_location: "",
    product_type: null,
    quantity: 1,
    width_top_mm: null,
    width_centre_mm: null,
    width_bottom_mm: null,
    height_left_mm: null,
    height_centre_mm: null,
    height_right_mm: null,
    wall_height_mm: null,
    wall_thickness_mm: null,
    photo_refs: [],
    remarks: "",
    sort_order: sortOrder,
    balcony_details: null,
    shower_details: null,
  };
}

export function isSpecializedMeasurementProduct(
  productType?: MeasurementProductType | string | null,
): productType is "Balcony" | "Bathroom" {
  return productType === "Balcony" || productType === "Bathroom";
}

export function emptySiteMeasurementForm(): SiteMeasurementFormData {
  return {
    client_name: "",
    project_name: "",
    measured_at: new Date().toISOString().slice(0, 10),
    project_address: "",
    client_contact: "",
    phone: "",
    site_rep: "",
    architect_designer: "",
    main_contractor: "",
    measured_by: "",
    aluminium_series: null,
    aluminium_colour: "",
    glass_type: "",
    mesh_required: false,
    grill_required: false,
    floor_finish: null,
    floor_finish_other: "",
    floor_finish_thickness_mm: null,
    site_status: [],
    lines: [emptyMeasurementLine(0)],
    operational_notes: "",
  };
}

export function hasSiteMeasurementFormData(
  form?: SiteMeasurementFormData | null,
): boolean {
  if (!form) return false;

  const hasLines = (form.lines ?? []).some(
    (line) =>
      (line.ref?.trim() ?? "") !== "" ||
      (line.room_location?.trim() ?? "") !== "" ||
      (line.product_type?.trim() ?? "") !== "" ||
      [line.width_centre_mm, line.height_centre_mm, line.width_top_mm].some(
        (v) => v != null && v > 0,
      ) ||
      hasBalconyDetailsData(line.balcony_details) ||
      hasShowerDetailsData(line.shower_details),
  );

  return hasLines || (form.operational_notes?.trim() ?? "") !== "";
}

export function isMeasurementFormLocked(
  status?: MeasurementFormStatus | string | null,
): boolean {
  return status === "submitted" || status === "approved" || status === "locked";
}
