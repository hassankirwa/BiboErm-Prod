import { KENYA_COUNTIES, resolveKenyaCoordinates } from "@/lib/kenya-locations";

export type LeadMapMarker = {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  stage: string;
  stageClassName: string;
  owner: string;
  company: string;
};

/** Resolve coordinates from location hints when API lat/lng are missing. */
export function resolveCoordsForLocation(
  location: string,
  hints?: {
    countySlug?: string;
    subcounty?: string;
    latitude?: number | null;
    longitude?: number | null;
  },
): [number, number] | null {
  if (hints) {
    const resolved = resolveKenyaCoordinates({
      countySlug: hints.countySlug,
      subcounty: hints.subcounty,
      latitude: hints.latitude,
      longitude: hints.longitude,
    });
    if (resolved) {
      return [resolved.lat, resolved.lng];
    }
  }

  const normalized = location.trim().toLowerCase();
  if (!normalized) return null;

  for (const county of KENYA_COUNTIES) {
    if (normalized.includes(county.label.toLowerCase())) {
      return [county.center.lat, county.center.lng];
    }
    for (const sub of county.subCounties) {
      if (normalized.includes(sub.toLowerCase())) {
        return [county.center.lat, county.center.lng];
      }
    }
  }

  return null;
}

/** Demo markers removed — map view uses API lead cards when provided. */
export function getLeadsMapMarkers(): LeadMapMarker[] {
  return [];
}

/** Center on Kenya with padding for all markers. */
export function getMapBounds(markers: LeadMapMarker[]): [[number, number], [number, number]] {
  if (markers.length === 0) {
    return [
      [-4.5, 33.5],
      [0.5, 41.5],
    ];
  }

  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const pad = 0.08;

  return [
    [Math.min(...lats) - pad, Math.min(...lngs) - pad],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad],
  ];
}
