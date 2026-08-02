import type { ApiSiteVisit } from "@/lib/api/crm/types";

function toCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Prefer visit pin; fall back to linked lead/project for older visits. */
export function resolveSiteVisitLocation(visit: ApiSiteVisit): {
  siteAddress: string | null;
  latitude: number | null;
  longitude: number | null;
} {
  const latitude =
    toCoord(visit.latitude) ??
    toCoord(visit.lead?.latitude) ??
    null;
  const longitude =
    toCoord(visit.longitude) ??
    toCoord(visit.lead?.longitude) ??
    null;

  const siteAddress =
    visit.site_address?.trim() ||
    visit.lead?.site_address?.trim() ||
    visit.project?.site_address?.trim() ||
    null;

  return { siteAddress, latitude, longitude };
}
