import { apiFetch } from "../client";
import type { ApiAccount, ApiContact, ApiDeal, ApiLead, ApiLeadDetail, PaginatedResponse } from "./types";
import { normalizeStringArray, unwrapResource } from "./types";

export type { ApiLead, ApiLeadDetail } from "./types";

export type CreateLeadPayload = {
  name: string;
  lead_type_id?: number | null;
  lead_source_id?: number | null;
  status?: string;
  priority?: string;
  lead_owner_id?: number | null;
  assigned_sales_user_id?: number | null;
  assigned_field_officer_id?: number | null;
  contact_person_name: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  job_title?: string | null;
  preferred_contact_method?: string | null;
  preferred_contact_time?: string | null;
  account_name?: string | null;
  account_type?: string | null;
  industry?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  website?: string | null;
  kra_pin?: string | null;
  billing_address?: string | null;
  product_interests: string[];
  requirement_description: string;
  property_site_type?: string | null;
  estimated_scope?: string | null;
  estimated_budget?: number | null;
  estimated_value?: number | null;
  expected_timeline?: string | null;
  urgency?: string | null;
  site_name?: string | null;
  site_address?: string | null;
  county_id?: number | null;
  area_estate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark?: string | null;
  site_contact_name?: string | null;
  site_contact_phone?: string | null;
  has_budget?: string | null;
  decision_maker_identified?: string | null;
  has_existing_supplier?: string | null;
  need_site_visit: boolean;
  expected_decision_date?: string | null;
  lead_quality_score?: string | null;
  qualification_notes?: string | null;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  internal_notes?: string | null;
  notes?: string | null;
  source?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
};

export type ConvertLeadPayload = {
  create_contact?: boolean;
  create_account?: boolean;
  create_deal?: boolean;
  deal_name?: string;
  estimated_value?: number;
  expected_close_date?: string;
  account_id?: number;
};

export type ConvertLeadResult = {
  data: {
    lead: ApiLeadDetail;
    account: ApiAccount | null;
    contact: ApiContact | null;
    deal: ApiDeal | null;
  };
};

export function leadDisplayName(lead: ApiLead): string {
  if (lead.name?.trim()) return lead.name.trim();
  if (lead.contact_person_name?.trim()) return lead.contact_person_name.trim();
  const fromParts = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  if (fromParts) return fromParts;
  return lead.account_name ?? lead.reference;
}

function normalizeLead<T extends ApiLead | ApiLeadDetail>(lead: T): T {
  return {
    ...lead,
    product_interests: normalizeStringArray(lead.product_interests),
  };
}

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

export async function fetchLeads(params?: {
  status?: string;
  search?: string;
  owner_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiLead>> {
  const res = await apiFetch<PaginatedResponse<ApiLead>>(
    `/api/v1/crm/leads${buildQuery(params)}`,
  );
  return { ...res, data: res.data.map(normalizeLead) };
}

export async function fetchLead(id: number): Promise<ApiLeadDetail> {
  const res = await apiFetch<ApiLeadDetail | { data: ApiLeadDetail }>(
    `/api/v1/crm/leads/${id}`,
  );
  return normalizeLead(unwrapResource(res));
}

export async function createLead(payload: CreateLeadPayload): Promise<ApiLeadDetail> {
  const res = await apiFetch<ApiLeadDetail | { data: ApiLeadDetail }>(
    "/api/v1/crm/leads",
    {
      method: "POST",
      json: payload,
    },
  );
  return unwrapResource(res);
}

export async function updateLead(
  id: number,
  payload: Partial<CreateLeadPayload>,
): Promise<ApiLeadDetail> {
  const res = await apiFetch<ApiLeadDetail | { data: ApiLeadDetail }>(
    `/api/v1/crm/leads/${id}`,
    {
      method: "PUT",
      json: payload,
    },
  );
  return unwrapResource(res);
}

export async function updateLeadStatus(
  id: number,
  status: string,
): Promise<ApiLeadDetail> {
  const res = await apiFetch<ApiLeadDetail | { data: ApiLeadDetail }>(
    `/api/v1/crm/leads/${id}/status`,
    {
      method: "PATCH",
      json: { status },
    },
  );
  return unwrapResource(res);
}

export async function convertLead(
  id: number,
  payload: ConvertLeadPayload = {},
): Promise<ConvertLeadResult> {
  return apiFetch<ConvertLeadResult>(`/api/v1/crm/leads/${id}/convert`, {
    method: "POST",
    json: payload,
  });
}

export type ImportLeadRow = {
  name: string;
  contact_person_name?: string;
  phone: string;
  email?: string | null;
  account_name?: string | null;
  site_address?: string | null;
  source?: string | null;
  estimated_value?: number | null;
};

export type ImportLeadsResult = {
  data: {
    imported: number;
    leads: Array<{ id: number; lead_number: string; name: string }>;
  };
};

export async function importLeads(
  leads: ImportLeadRow[],
): Promise<ImportLeadsResult> {
  return apiFetch<ImportLeadsResult>("/api/v1/crm/leads/import", {
    method: "POST",
    json: { leads },
  });
}

/** Upload attachment when backend exposes POST /api/v1/crm/leads/{id}/attachments */
export async function uploadLeadAttachment(
  leadId: number,
  file: File,
): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);

  return apiFetch(`/api/v1/crm/leads/${leadId}/attachments`, {
    method: "POST",
    body: form,
  });
}
