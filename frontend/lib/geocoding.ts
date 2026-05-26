export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
  placeId?: string;
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "BiboERM/1.0 (CRM location search)";

let lastRequestAt = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastRequestAt));
  if (wait > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();

  return fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": USER_AGENT,
    },
  });
}

function pushUnique(parts: string[], seen: Set<string>, value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  parts.push(trimmed);
}

/** Street-level line from Nominatim structured address (not county/state). */
export function buildStreetAddressFromNominatim(item: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}): string {
  const addr = item.address;
  const parts: string[] = [];
  const seen = new Set<string>();

  if (addr) {
    const namedPlace = [
      addr.amenity,
      addr.shop,
      addr.office,
      addr.building,
      addr.leisure,
      addr.tourism,
      addr.historic,
      addr.industrial,
    ].find(Boolean);

    if (namedPlace) {
      pushUnique(parts, seen, namedPlace);
    }

    const roadLine =
      addr.house_number && addr.road
        ? `${addr.house_number.trim()} ${addr.road.trim()}`
        : addr.road?.trim();
    if (roadLine) {
      pushUnique(parts, seen, roadLine);
    }

    for (const key of [
      "neighbourhood",
      "suburb",
      "hamlet",
      "quarter",
      "city_district",
      "residential",
    ] as const) {
      pushUnique(parts, seen, addr[key]);
    }

    pushUnique(
      parts,
      seen,
      addr.city ?? addr.town ?? addr.village ?? addr.municipality,
    );
    pushUnique(parts, seen, addr.postcode);
  }

  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (item.display_name?.trim()) {
    return item.display_name.trim();
  }

  return "";
}

/** True when Nominatim returned road, building, or similar detail (not admin-only). */
export function hasStreetLevelDetail(
  address: Record<string, string | undefined> | undefined,
): boolean {
  if (!address) return false;

  const streetKeys = [
    "road",
    "house_number",
    "pedestrian",
    "footway",
    "path",
    "amenity",
    "building",
    "shop",
    "office",
    "industrial",
    "leisure",
    "tourism",
    "historic",
    "neighbourhood",
    "suburb",
    "hamlet",
    "residential",
  ] as const;

  return streetKeys.some((key) => Boolean(address[key]?.trim()));
}

function formatNominatimSearchLabel(item: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}): string {
  if (item.display_name?.trim()) {
    return item.display_name.trim();
  }

  const built = buildStreetAddressFromNominatim(item);
  return built || "Selected location";
}

type NominatimSearchItem = {
  place_id?: number;
  lat: string;
  lon: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
};

type NominatimReverseItem = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

export type ReverseGeocodeDetails = {
  label: string;
  address: Record<string, string | undefined>;
  hasStreetDetail: boolean;
};

export async function searchLocations(
  query: string,
  options?: { countryCodes?: string; limit?: number },
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    addressdetails: "1",
    limit: String(options?.limit ?? 5),
  });

  if (options?.countryCodes) {
    params.set("countrycodes", options.countryCodes);
  }

  const response = await rateLimitedFetch(
    `${NOMINATIM_BASE}/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Location search failed. Please try again.");
  }

  const data = (await response.json()) as NominatimSearchItem[];

  return data.reduce<GeocodeResult[]>((results, item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return results;

    results.push({
      lat,
      lng,
      label: formatNominatimSearchLabel(item),
      placeId: item.place_id != null ? String(item.place_id) : undefined,
    });

    return results;
  }, []);
}

export async function reverseGeocodeDetails(
  lat: number,
  lng: number,
  options?: { zoom?: number },
): Promise<ReverseGeocodeDetails | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
    zoom: String(options?.zoom ?? 18),
  });

  const response = await rateLimitedFetch(
    `${NOMINATIM_BASE}/reverse?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Could not resolve address for this pin.");
  }

  const data = (await response.json()) as NominatimReverseItem;
  const label = buildStreetAddressFromNominatim(data);
  const address = data.address ?? {};

  if (!label && !data.display_name) {
    return null;
  }

  return {
    label: label || data.display_name?.trim() || "Selected location",
    address,
    hasStreetDetail: hasStreetLevelDetail(address),
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options?: { zoom?: number },
): Promise<string | null> {
  const details = await reverseGeocodeDetails(lat, lng, options);
  return details?.label ?? null;
}

export function geolocationErrorMessage(error: unknown): string {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location permission denied. Allow location access in your browser or device settings, then try again.";
      case error.POSITION_UNAVAILABLE:
        return "GPS position unavailable. Move to an open area and try again.";
      case error.TIMEOUT:
        return "GPS timed out. Check that location services are on and try again.";
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not capture GPS location.";
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    });
  });
}
