import { apiFetch } from "../client";
import { unwrapResource } from "./types";
import type { SiteMeasurementFormData } from "@/lib/measurements/types";
import type { ApiSiteVisit, PaginatedResponse } from "./types";

export type { ApiSiteVisit } from "./types";

export type ScheduleSiteVisitPayload = {
  title: string;
  lead_id?: number | null;
  deal_id?: number | null;
  account_id?: number | null;
  project_id?: number | null;
  contact_id?: number | null;
  site_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  assigned_field_officer_id: number;
  visit_date: string;
  visit_time?: string | null;
  visit_purpose?: string | null;
  measurement_context?: "quotation" | "production";
  requires_measurements?: boolean;
  notes_for_field_officer?: string | null;
};

export type SubmitSiteVisitPayload = {
  client_present?: boolean;
  visit_outcome?: string;
  follow_up_required?: boolean;
  field_officer_notes?: string;
};

export type SiteVisitMeasurementLine = {
  room_area_name: string;
  width?: number;
  height?: number;
  quantity?: number;
  material_preference?: string;
  installation_notes?: string;
  obstacles_notes?: string;
  client_comments?: string;
  sort_order?: number;
};

export type SubmitSiteVisitMeasurementsPayload = {
  lines: SiteVisitMeasurementLine[];
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
  measurement_context?: "quotation" | "production";
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiSiteVisit>> {
  return apiFetch<PaginatedResponse<ApiSiteVisit>>(
    `/api/v1/crm/site-visits${buildQuery(params)}`,
  );
}

export async function fetchTodaySiteVisits(params?: {
  measurement_context?: "quotation" | "production";
}): Promise<{ data: ApiSiteVisit[] }> {
  return apiFetch<{ data: ApiSiteVisit[] }>(
    `/api/v1/crm/site-visits/today${buildQuery(params)}`,
  );
}

export async function fetchOpenAssignedSiteVisits(params?: {
  measurement_context?: "quotation" | "production";
}): Promise<{ data: ApiSiteVisit[] }> {
  return apiFetch<{ data: ApiSiteVisit[] }>(
    `/api/v1/crm/site-visits/open${buildQuery(params)}`,
  );
}

export async function fetchAssignedSiteVisitHistory(params?: {
  measurement_context?: "quotation" | "production";
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiSiteVisit>> {
  return apiFetch<PaginatedResponse<ApiSiteVisit>>(
    `/api/v1/crm/site-visits/history${buildQuery(params)}`,
  );
}

export async function fetchSiteVisit(id: number): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}`,
  );
  return unwrapResource(res);
}

export async function scheduleSiteVisit(
  payload: ScheduleSiteVisitPayload,
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    "/api/v1/crm/site-visits",
    {
      method: "POST",
      json: payload,
    },
  );
  return unwrapResource(res);
}

export async function startSiteVisit(
  id: number,
  payload?: { latitude?: number; longitude?: number },
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/start`,
    { method: "POST", json: payload ?? {} },
  );
  return unwrapResource(res);
}

export async function saveSiteMeasurementForm(
  id: number,
  form: SiteMeasurementFormData,
  options?: { draft?: boolean },
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/measurement-form`,
    { method: "PATCH", json: { form, draft: options?.draft ?? false } },
  );
  return unwrapResource(res);
}

export async function uploadSiteMeasurementSketch(
  visitId: number,
  file: File,
): Promise<ApiSiteVisit> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${visitId}/measurement-form/sketch`,
    { method: "POST", body: form },
  );
  return unwrapResource(res);
}

export async function submitSiteVisitMeasurements(
  id: number,
  payload: SubmitSiteVisitMeasurementsPayload,
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/measurements`,
    { method: "POST", json: payload },
  );
  return unwrapResource(res);
}

export async function submitSiteVisit(
  id: number,
  payload: SubmitSiteVisitPayload = {},
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/submit`,
    { method: "POST", json: payload },
  );
  return unwrapResource(res);
}

export async function approveSiteVisit(id: number): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/approve`,
    { method: "POST" },
  );
  return unwrapResource(res);
}

export async function requestSiteVisitChanges(
  id: number,
  payload: {
    action: "clarification_needed" | "revisit_required";
    notes: string;
  },
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/request-changes`,
    { method: "POST", json: payload },
  );
  return unwrapResource(res);
}

export async function reassignSiteVisit(
  id: number,
  assignedFieldOfficerId: number,
): Promise<ApiSiteVisit> {
  const res = await apiFetch<ApiSiteVisit | { data: ApiSiteVisit }>(
    `/api/v1/crm/site-visits/${id}/reassign`,
    {
      method: "PATCH",
      json: { assigned_field_officer_id: assignedFieldOfficerId },
    },
  );
  return unwrapResource(res);
}

export type SiteVisitPhotoUpload = {
  id: number;
  file_path: string | null;
  url: string | null;
};

/** Upload visit photo (also used for per-line measurement photos). */
export async function uploadSiteVisitPhoto(
  visitId: number,
  file: File,
  caption?: string,
): Promise<SiteVisitPhotoUpload> {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);

  const res = await apiFetch<
    SiteVisitPhotoUpload | { data: SiteVisitPhotoUpload }
  >(`/api/v1/crm/site-visits/${visitId}/photos`, {
    method: "POST",
    body: form,
  });
  return unwrapResource(res);
}
