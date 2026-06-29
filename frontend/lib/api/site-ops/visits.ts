import { apiFetch } from "../client";
import { unwrapResource } from "../crm/types";
import type { PaginatedMeta, PaginatedResponse } from "../crm/types";

export type ApiSiteOpsVisit = {
  id: number;
  visit_number: string | null;
  title: string | null;
  status: string | null;
  visit_date: string | null;
  visit_time: string | null;
  visit_type: string | null;
  site_address: string | null;
  lead_id: number | null;
  assigned_field_officer_id: number | null;
  assigned_to: number | null;
  lead?: {
    id: number;
    name: string | null;
    reference: string | null;
  } | null;
  assigned_to_user?: { id: number; name: string | null } | null;
  assigned_field_officer?: { id: number; name: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
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

export async function fetchSiteOpsVisits(params?: {
  status?: string;
  visit_type?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiSiteOpsVisit>> {
  const res = await apiFetch<
    PaginatedResponse<ApiSiteOpsVisit> & PaginatedMeta
  >(`/api/v1/site-ops/visits${buildQuery(params)}`);

  return {
    data: res.data ?? [],
    meta: res.meta ?? {
      current_page: res.current_page ?? 1,
      last_page: res.last_page ?? 1,
      per_page: res.per_page ?? params?.per_page,
      total: res.total ?? res.data?.length ?? 0,
    },
    links: res.links,
  };
}

export async function fetchSiteOpsVisit(id: number): Promise<ApiSiteOpsVisit> {
  const res = await apiFetch<ApiSiteOpsVisit | { data: ApiSiteOpsVisit }>(
    `/api/v1/site-ops/visits/${id}`,
  );
  return unwrapResource(res);
}
