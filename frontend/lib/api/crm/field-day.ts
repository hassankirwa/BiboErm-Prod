import { apiFetch } from "../client";
import type { ApiFieldDay, ApiFieldDayPin, ApiLeadDetail, PaginatedResponse } from "./types";
import { unwrapResource } from "./types";

export type { ApiFieldDay, ApiFieldDayPin } from "./types";

/** PostgreSQL decimals often arrive as strings from the API. */
export function parseCoord(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatCoord(value: unknown, decimals = 5): string {
  const n = parseCoord(value);
  return n != null ? n.toFixed(decimals) : "—";
}

/** Admin hierarchy line, e.g. "Nairobi · Kasarani · Sunton". */
export function formatPinAdminLine(pin: ApiFieldDayPin): string | null {
  const parts = [
    pin.county?.label ?? null,
    pin.subcounty?.trim() || null,
    pin.ward?.trim() || null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Street or formatted reverse-geocode line for a pin. */
export function formatPinStreetLine(pin: ApiFieldDayPin): string | null {
  const address = pin.location_address?.trim();
  return address || null;
}

export function formatPinGpsBadge(pin: ApiFieldDayPin): string | null {
  const accuracyM = parseCoord(pin.accuracy_m);
  const parts = ["GPS verified"];

  if (accuracyM != null) {
    parts.push(`±${Math.round(accuracyM)} m`);
  }

  if (pin.captured_at) {
    const captured = new Date(pin.captured_at);
    if (!Number.isNaN(captured.getTime())) {
      parts.push(
        captured.toLocaleString([], {
          dateStyle: "short",
          timeStyle: "short",
        }),
      );
    }
  }

  return parts.length > 1 ? parts.join(" · ") : null;
}

function normalizeFieldDayPin(pin: ApiFieldDayPin): ApiFieldDayPin {
  return {
    ...pin,
    latitude: parseCoord(pin.latitude),
    longitude: parseCoord(pin.longitude),
    accuracy_m: parseCoord(pin.accuracy_m),
  };
}

function normalizeFieldDay(fieldDay: ApiFieldDay): ApiFieldDay {
  return {
    ...fieldDay,
    pins: fieldDay.pins?.map(normalizeFieldDayPin),
  };
}

export type FieldDayPinPayload = {
  lead_id?: number | null;
  contact_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy_m?: number | null;
  captured_at?: string | null;
  notes?: string | null;
  findings?: string | null;
  site_label?: string | null;
  county_id?: number | null;
  subcounty?: string | null;
  ward?: string | null;
  location_address?: string | null;
};

export type CreateFieldDayPayload = {
  field_date: string;
  field_officer_id: number;
  notes?: string | null;
  pins?: FieldDayPinPayload[];
};

export type StartFieldDayPayload = {
  field_date?: string;
  field_officer_id?: number;
  notes?: string | null;
};

function buildQuery(params?: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function fetchFieldDays(params?: {
  field_officer_id?: number;
  field_date?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiFieldDay>> {
  const res = await apiFetch<
    PaginatedResponse<ApiFieldDay> & { data: ApiFieldDay[] }
  >(`/api/v1/crm/field-days${buildQuery(params)}`);
  return {
    data: (res.data ?? []).map(normalizeFieldDay),
    meta: res.meta ?? {
      current_page: (res as { current_page?: number }).current_page ?? 1,
      last_page: (res as { last_page?: number }).last_page ?? 1,
      total: (res as { total?: number }).total ?? res.data?.length ?? 0,
    },
  };
}

export async function fetchFieldDay(id: number): Promise<ApiFieldDay> {
  const res = await apiFetch<ApiFieldDay | { data: ApiFieldDay }>(
    `/api/v1/crm/field-days/${id}`,
  );
  return normalizeFieldDay(unwrapResource(res));
}

export async function fetchFieldDayPin(id: number): Promise<ApiFieldDayPin> {
  const res = await apiFetch<ApiFieldDayPin | { data: ApiFieldDayPin }>(
    `/api/v1/crm/field-day-pins/${id}`,
  );
  return normalizeFieldDayPin(unwrapResource(res));
}

export async function startFieldDay(
  payload?: StartFieldDayPayload,
): Promise<ApiFieldDay> {
  const res = await apiFetch<ApiFieldDay | { data: ApiFieldDay }>(
    "/api/v1/crm/field-days/start",
    {
      method: "POST",
      json: payload ?? {},
    },
  );
  return normalizeFieldDay(unwrapResource(res));
}

export async function createFieldDay(
  payload: CreateFieldDayPayload,
): Promise<ApiFieldDay> {
  const res = await apiFetch<ApiFieldDay | { data: ApiFieldDay }>(
    "/api/v1/crm/field-days",
    {
      method: "POST",
      json: payload,
    },
  );
  return normalizeFieldDay(unwrapResource(res));
}

export async function addFieldDayPin(
  fieldDayId: number,
  payload: FieldDayPinPayload,
): Promise<ApiFieldDayPin> {
  const res = await apiFetch<ApiFieldDayPin | { data: ApiFieldDayPin }>(`/api/v1/crm/field-days/${fieldDayId}/pins`, {
    method: "POST",
    json: payload,
  });
  return normalizeFieldDayPin(unwrapResource(res));
}

export async function convertFieldDayPinToLead(
  pinId: number,
): Promise<ApiLeadDetail> {
  const res = await apiFetch<ApiLeadDetail | { data: ApiLeadDetail }>(
    `/api/v1/crm/field-day-pins/${pinId}/convert-to-lead`,
    {
      method: "POST",
    },
  );
  return unwrapResource(res);
}

export async function uploadFieldDayPinPhoto(
  pinId: number,
  file: File,
  options?: { caption?: string; sort_order?: number },
): Promise<{ data: { id: number; url?: string | null } }> {
  const form = new FormData();
  form.append("file", file);
  if (options?.caption) form.append("caption", options.caption);
  if (options?.sort_order != null) {
    form.append("sort_order", String(options.sort_order));
  }

  return apiFetch(`/api/v1/crm/field-day-pins/${pinId}/photos`, {
    method: "POST",
    body: form,
  });
}
