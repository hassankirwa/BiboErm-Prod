import { apiFetch } from "../client";
import type { ApiFieldDay, PaginatedResponse } from "./types";
import { unwrapResource } from "./types";

export type { ApiFieldDay, ApiFieldDayPin } from "./types";

export type FieldDayPinPayload = {
  lead_id?: number | null;
  contact_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export type CreateFieldDayPayload = {
  field_date: string;
  field_officer_id: number;
  notes?: string | null;
  pins?: FieldDayPinPayload[];
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
    data: res.data ?? [],
    meta: res.meta ?? {
      current_page: (res as { current_page?: number }).current_page ?? 1,
      last_page: (res as { last_page?: number }).last_page ?? 1,
      total: (res as { total?: number }).total ?? res.data?.length ?? 0,
    },
  };
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
  return unwrapResource(res);
}
