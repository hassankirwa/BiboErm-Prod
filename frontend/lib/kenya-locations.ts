import countiesData from "@/lib/kenya-locations.json";
import type { CrmLookupItem } from "@/lib/api/crm/types";
import { reverseGeocodeDetails } from "@/lib/geocoding";

export type KenyaCounty = {
  slug: string;
  label: string;
  center: { lat: number; lng: number };
  subCounties: string[];
};

export type KenyaAdminResolution = {
  countySlug: string | null;
  countyLabel: string | null;
  subcounty: string | null;
  ward: string | null;
  addressLabel: string | null;
  hasStreetDetail?: boolean;
};

export const KENYA_COUNTIES = countiesData as KenyaCounty[];

const KENYA_ADMIN_SUFFIXES = /\s+(?:division|sublocation|location)\s*$/i;

function normalizeLocationName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcounty\b/gi, "")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip Nominatim admin suffixes before matching sub-counties. */
function stripKenyaAdminSuffix(value: string): string {
  return value.replace(KENYA_ADMIN_SUFFIXES, "").trim();
}

function normalizeSubCountyCandidate(value: string): string {
  return normalizeLocationName(stripKenyaAdminSuffix(value));
}

function slugifyLocationName(value: string): string {
  return normalizeLocationName(value).replace(/\s+/g, "-");
}

function matchCounty(candidate: string): KenyaCounty | undefined {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  const normalized = normalizeLocationName(trimmed);
  const slug = slugifyLocationName(trimmed);

  const bySlug = getCountyBySlug(slug);
  if (bySlug) return bySlug;

  const exact = KENYA_COUNTIES.find(
    (county) => normalizeLocationName(county.label) === normalized,
  );
  if (exact) return exact;

  return KENYA_COUNTIES.find((county) => {
    const countyNorm = normalizeLocationName(county.label);
    return (
      countyNorm.includes(normalized) ||
      normalized.includes(countyNorm) ||
      normalized.replace(/\s+/g, "") === countyNorm.replace(/\s+/g, "")
    );
  });
}

function matchSubCounty(
  county: KenyaCounty,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const normalized = normalizeSubCountyCandidate(trimmed);

    const exact = county.subCounties.find(
      (subcounty) => normalizeLocationName(subcounty) === normalized,
    );
    if (exact) return exact;

    const partial = county.subCounties.find((subcounty) => {
      const subcountyNorm = normalizeLocationName(subcounty);
      return (
        subcountyNorm.includes(normalized) ||
        normalized.includes(subcountyNorm) ||
        subcountyNorm.startsWith(normalized) ||
        normalized.startsWith(subcountyNorm)
      );
    });
    if (partial) return partial;

    const words = normalized.split(" ").filter((word) => word.length > 2);
    if (words.length > 0) {
      const wordMatch = county.subCounties.find((subcounty) => {
        const subcountyNorm = normalizeLocationName(subcounty);
        return words.every((word) => subcountyNorm.includes(word));
      });
      if (wordMatch) return wordMatch;
    }
  }

  return null;
}

/** Map a raw sub-county label to a known dropdown option for the county. */
export function resolveSubcountyForCounty(
  countySlug: string,
  rawSubcounty: string | null | undefined,
): string | null {
  const trimmed = rawSubcounty?.trim();
  if (!trimmed) return null;

  const county = getCountyBySlug(countySlug);
  if (!county) return null;

  return matchSubCounty(county, [trimmed]);
}

function candidateMatchesSubCounty(
  county: KenyaCounty,
  candidate: string,
  subcounty: string | null,
): boolean {
  if (matchSubCounty(county, [candidate])) {
    return true;
  }

  if (!subcounty) return false;

  const subcountyNorm = normalizeLocationName(subcounty);
  const candidateNorm = normalizeSubCountyCandidate(candidate);

  return (
    candidateNorm === subcountyNorm ||
    candidateNorm.includes(subcountyNorm) ||
    subcountyNorm.includes(candidateNorm)
  );
}

function extractWard(
  address: Record<string, string | undefined>,
  county: KenyaCounty | undefined,
  subcounty: string | null,
): string | null {
  const subcountyNorm = subcounty ? normalizeLocationName(subcounty) : null;
  const candidates = [
    address.suburb,
    address.neighbourhood,
    address.city_district,
    address.quarter,
    address.hamlet,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const normalized = normalizeSubCountyCandidate(trimmed);
    if (subcountyNorm && normalized === subcountyNorm) continue;

    if (county && candidateMatchesSubCounty(county, trimmed, subcounty)) {
      continue;
    }

    const countyMatch = matchCounty(trimmed);
    if (countyMatch) continue;

    return trimmed;
  }

  return null;
}

export function resolveKenyaAdminFromNominatimAddress(
  address: Record<string, string | undefined>,
): KenyaAdminResolution {
  const countyCandidates = [
    address.county,
    address.state,
    address["ISO3166-2-lvl4"],
  ].filter(Boolean) as string[];

  let county: KenyaCounty | undefined;
  for (const candidate of countyCandidates) {
    county = matchCounty(candidate);
    if (county) break;
  }

  if (!county && address.city) {
    county = matchCounty(address.city);
  }

  const subcountyCandidates = [
    address.county_district,
    address.state_district,
    address.city_district,
    address.city,
    address.municipality,
    address.town,
  ].filter(Boolean) as string[];

  const subcounty = county
    ? matchSubCounty(county, subcountyCandidates)
    : null;
  const ward = extractWard(address, county, subcounty);

  return {
    countySlug: county?.slug ?? null,
    countyLabel: county?.label ?? null,
    subcounty,
    ward,
    addressLabel: null,
  };
}

export async function resolveKenyaAdminFromCoordinates(
  lat: number,
  lng: number,
): Promise<KenyaAdminResolution | null> {
  const details = await reverseGeocodeDetails(lat, lng);
  if (!details) return null;

  const admin = resolveKenyaAdminFromNominatimAddress(details.address);
  return {
    ...admin,
    addressLabel: details.label,
    hasStreetDetail: details.hasStreetDetail,
  };
}

export function getCountyBySlug(slug: string): KenyaCounty | undefined {
  return KENYA_COUNTIES.find((c) => c.slug === slug);
}

export function getSubCountiesForCounty(slug: string): string[] {
  return getCountyBySlug(slug)?.subCounties ?? [];
}

export function resolveCountyId(
  lookups: CrmLookupItem[] | undefined,
  countySlug: string,
): number | null {
  if (!countySlug || !lookups?.length) return null;
  const county = getCountyBySlug(countySlug);
  if (!county) return null;
  const match = lookups.find(
    (item) =>
      item.slug === county.slug ||
      item.label.toLowerCase() === county.label.toLowerCase(),
  );
  return match?.id ?? null;
}

/** Approximate coordinates when no map pin is set. */
export function resolveKenyaCoordinates(options: {
  countySlug?: string;
  subcounty?: string;
  latitude?: number | null;
  longitude?: number | null;
}): { lat: number; lng: number } | null {
  if (
    options.latitude != null &&
    options.longitude != null &&
    !Number.isNaN(options.latitude) &&
    !Number.isNaN(options.longitude)
  ) {
    return { lat: options.latitude, lng: options.longitude };
  }

  const county = options.countySlug
    ? getCountyBySlug(options.countySlug)
    : undefined;
  if (!county) return null;

  if (options.subcounty) {
    const normalized = options.subcounty.trim().toLowerCase();
    const index = county.subCounties.findIndex(
      (sc) => sc.toLowerCase() === normalized,
    );
    if (index >= 0) {
      const offset = (index - county.subCounties.length / 2) * 0.015;
      return {
        lat: county.center.lat + offset,
        lng: county.center.lng + offset * 0.8,
      };
    }
  }

  return county.center;
}

/** True when a reverse-geocode label is admin hierarchy only (no street detail). */
export function isAdminOnlyLocationLabel(
  label: string | null | undefined,
  admin?: Pick<
    KenyaAdminResolution,
    "countyLabel" | "subcounty" | "ward"
  > | null,
): boolean {
  const trimmed = label?.trim();
  if (!trimmed) return false;

  if (/\b(?:division|sublocation)\b/i.test(trimmed)) {
    return !/\b(?:road|street|avenue|drive|lane|plot|building|estate)\b/i.test(
      trimmed,
    );
  }

  if (!admin) return false;

  const parts = [
    admin.ward,
    admin.subcounty,
    admin.countyLabel,
  ].filter(Boolean) as string[];

  if (parts.length === 0) return false;

  const normalizedLabel = normalizeLocationName(trimmed);
  const adminOnly = normalizeLocationName(parts.join(", "));

  return (
    normalizedLabel === adminOnly ||
    parts.every((part) => normalizedLabel.includes(normalizeLocationName(part)))
  );
}

export function buildSiteAddressFromLocation(form: {
  siteAddress?: string;
  areaEstate?: string;
  subcounty?: string;
  ward?: string;
  countySlug?: string;
}): string {
  const parts = [
    form.siteAddress?.trim(),
    form.areaEstate?.trim(),
    form.ward?.trim(),
    form.subcounty?.trim(),
    form.countySlug
      ? getCountyBySlug(form.countySlug)?.label ?? form.countySlug
      : "",
  ].filter(Boolean);
  return parts.join(", ");
}
