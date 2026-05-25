import { apiFetch } from "../client";
import type { ApiSiteVisit, PaginatedResponse } from "./types";

export type { ApiSiteVisit } from "./types";

export type ScheduleSiteVisitPayload = {
  title: string;
  lead_id?: number | null;
  deal_id?: number | null;
  account_id?: number | null;
  contact_id?: number | null;
  site_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  assigned_field_officer_id: number;
  visit_date: string;
  visit_time?: string | null;
  visit_purpose?: string | null;
  notes_for_field_officer?: string | null;
};

export type SubmitSiteVisitPayload = {
  client_present?: boolean;
  visit_outcome?: string;
  follow_up_required?: boolean;
  field_officer_notes?: string;
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

export async function fetchSiteVisits(params?: {
  status?: string;
  visit_date?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiSiteVisit>> {
  return apiFetch<PaginatedResponse<ApiSiteVisit>>(
    `/api/v1/crm/site-visits${buildQuery(params)}`,
  );
}

export async function fetchTodaySiteVisits(): Promise<{ data: ApiSiteVisit[] }> {
  return apiFetch<{ data: ApiSiteVisit[] }>("/api/v1/crm/site-visits/today");
}

export async function scheduleSiteVisit(
  payload: ScheduleSiteVisitPayload,
): Promise<ApiSiteVisit> {
  return apiFetch<ApiSiteVisit>("/api/v1/crm/site-visits", {
    method: "POST",
    json: payload,
  });
}

export async function startSiteVisit(
  id: number,
  payload?: { latitude?: number; longitude?: number },
): Promise<ApiSiteVisit> {
  return apiFetch<ApiSiteVisit>(`/api/v1/crm/site-visits/${id}/start`, {
    method: "POST",
    json: payload ?? {},
  });
}

export async function submitSiteVisit(
  id: number,
  payload: SubmitSiteVisitPayload = {},
): Promise<ApiSiteVisit> {
  return apiFetch<ApiSiteVisit>(`/api/v1/crm/site-visits/${id}/submit`, {
    method: "POST",
    json: payload,
  });
}

export async function approveSiteVisit(id: number): Promise<ApiSiteVisit> {
  return apiFetch<ApiSiteVisit>(`/api/v1/crm/site-visits/${id}/approve`, {
    method: "POST",
  });
}

/** Upload visit photo when backend exposes POST /api/v1/crm/site-visits/{id}/photos */
export async function uploadSiteVisitPhoto(
  visitId: number,
  file: File,
  caption?: string,
): Promise<unknown> {
  const form = new FormData();
  form.append("photo", file);
  if (caption) form.append("caption", caption);

  return apiFetch(`/api/v1/crm/site-visits/${visitId}/photos`, {
    method: "POST",
    body: form,
  });
}
