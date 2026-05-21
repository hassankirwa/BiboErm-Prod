import { leadKanbanCards } from "@/lib/leads-kanban-data";
import { leadsListRows } from "@/lib/leads-list-data";

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

/** Approximate coordinates for Kenya lead areas (mock geocoding). */
const LOCATION_COORDS: Record<string, [number, number]> = {
  "Kilimani, Nairobi": [-1.2921, 36.782],
  "Ngong Road, Nairobi": [-1.3034, 36.7667],
  "Embakasi, Nairobi": [-1.3192, 36.894],
  "Westlands, Nairobi": [-1.2674, 36.807],
  "Ruiru, Kiambu": [-1.15, 36.96],
  "Thika Road, Nairobi": [-1.2, 36.89],
  "Parklands, Nairobi": [-1.263, 36.815],
  "Karen, Nairobi": [-1.3197, 36.7073],
  "Muthaiga, Nairobi": [-1.24, 36.82],
  "Lavington, Nairobi": [-1.278, 36.77],
  "Nyali, Mombasa": [-4.0435, 39.728],
  "Mombasa": [-4.0435, 39.6682],
  "Nakuru CBD": [-0.3031, 36.08],
  "Nakuru": [-0.3031, 36.08],
  "Kisumu": [-0.1022, 34.7617],
  "Athi River": [-1.4533, 36.9783],
  "Runda, Nairobi": [-1.217, 36.84],
  "Upper Hill, Nairobi": [-1.292, 36.821],
  "Nairobi CBD": [-1.2864, 36.8172],
};

const NAME_LOCATION_HINTS: { pattern: RegExp; location: string }[] = [
  { pattern: /kilimani/i, location: "Kilimani, Nairobi" },
  { pattern: /westlands/i, location: "Westlands, Nairobi" },
  { pattern: /karen/i, location: "Karen, Nairobi" },
  { pattern: /mombasa|nyali|beach/i, location: "Nyali, Mombasa" },
  { pattern: /ngong/i, location: "Ngong Road, Nairobi" },
  { pattern: /thika/i, location: "Thika Road, Nairobi" },
  { pattern: /lavington/i, location: "Lavington, Nairobi" },
  { pattern: /nakuru/i, location: "Nakuru CBD" },
  { pattern: /kisumu/i, location: "Kisumu" },
  { pattern: /runda/i, location: "Runda, Nairobi" },
  { pattern: /industrial|athi/i, location: "Athi River" },
  { pattern: /embakasi/i, location: "Embakasi, Nairobi" },
  { pattern: /parklands/i, location: "Parklands, Nairobi" },
  { pattern: /muthaiga/i, location: "Muthaiga, Nairobi" },
  { pattern: /upper hill/i, location: "Upper Hill, Nairobi" },
];

function resolveCoords(location: string): [number, number] | null {
  const exact = LOCATION_COORDS[location];
  if (exact) return exact;

  const key = Object.keys(LOCATION_COORDS).find((k) =>
    location.toLowerCase().includes(k.split(",")[0].toLowerCase())
  );
  if (key) return LOCATION_COORDS[key];

  return null;
}

function inferLocationFromName(leadName: string): string | null {
  for (const { pattern, location } of NAME_LOCATION_HINTS) {
    if (pattern.test(leadName)) return location;
  }
  return null;
}

function kanbanLocationByTitle(title: string): string | null {
  const card = leadKanbanCards.find(
    (c) =>
      c.title.toLowerCase() === title.toLowerCase() ||
      title.toLowerCase().includes(c.title.toLowerCase()) ||
      c.title.toLowerCase().includes(title.toLowerCase().split(" ")[0])
  );
  return card?.location ?? null;
}

export function getLeadsMapMarkers(): LeadMapMarker[] {
  const markers: LeadMapMarker[] = [];

  for (const row of leadsListRows) {
    const location =
      kanbanLocationByTitle(row.leadName) ??
      inferLocationFromName(row.leadName);
    if (!location) continue;

    const coords = resolveCoords(location);
    if (!coords) continue;

    markers.push({
      id: row.id,
      title: row.leadName,
      location,
      lat: coords[0],
      lng: coords[1],
      stage: row.stage,
      stageClassName: row.stageClassName,
      owner: row.owner,
      company: row.company,
    });
  }

  return markers;
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
