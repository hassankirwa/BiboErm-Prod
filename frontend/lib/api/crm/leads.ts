import { apiFetch, ensureCsrfCookie } from "../client";
import type { ApiAccount, ApiContact, ApiDeal, ApiLead, ApiLeadDetail, PaginatedResponse } from "./types";
import { normalizeStringArray, unwrapResource } from "./types";

export type { ApiLead, ApiLeadDetail } from "./types";

export type CreateLeadPayload = {
  name: string;
  lead_type_id?: number | null;
  lead_source_id?: number | null;
  status?: string;
  pipeline_stage?: string | null;
  priority?: string;
  lead_owner_id?: number | null;
  assigned_sales_user_id?: number | null;
  assigned_field_officer_id?: number | null;
  contact_person_name?: string | null;
  phone?: string | null;
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
  product_interests?: string[];
  requirement_description?: string;
  property_site_type?: string | null;
  estimated_scope?: string | null;
  estimated_budget?: number | null;
  estimated_value?: number | null;
  expected_timeline?: string | null;
  urgency?: string | null;
  site_name?: string | null;
  site_address?: string | null;
  county_id?: number | null;
  subcounty?: string | null;
  ward?: string | null;
  area_estate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark?: string | null;
  site_contact_name?: string | null;
  site_contact_phone?: string | null;
  has_budget?: string | null;
  decision_maker_identified?: string | null;
  has_existing_supplier?: string | null;
  need_site_visit?: boolean;
  expected_decision_date?: string | null;
  lead_quality_score?: string | null;
  qualification_notes?: string | null;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  internal_notes?: string | null;
  notes?: string | null;
  source?: string | null;
  field_day_pin_id?: number | null;
  building_construction_stage_id?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  existing_account_id?: number | null;
};

export type ConvertLeadPayload = {
  create_contact?: boolean;
  create_account?: boolean;
  create_deal?: boolean;
  deal_name?: string;
  estimated_value?: number;
  expected_close_date?: string;
  account_id?: number;
  quotation_id?: number;
  payment_reference?: string;
  payment_date?: string;
  amount_paid?: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
};

export type ConvertLeadResult = {
  data: {
    lead: ApiLeadDetail;
    account: ApiAccount | null;
    contact: ApiContact | null;
    deal: ApiDeal | null;
    payment?: {
      id: number;
      payment_reference: string;
      amount_paid: string | number;
    } | null;
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
  unassigned?: boolean;
  hot?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiLead>> {
  const queryParams: Record<string, string | number | undefined> = {
    status: params?.status,
    search: params?.search,
    owner_id: params?.owner_id,
    date_from: params?.date_from,
    date_to: params?.date_to,
    page: params?.page,
    per_page: params?.per_page,
  };
  if (params?.unassigned) {
    queryParams.unassigned = 1;
  }
  if (params?.hot) {
    queryParams.hot = 1;
  }
  const res = await apiFetch<
    PaginatedResponse<ApiLead> & {
      current_page?: number;
      last_page?: number;
      total?: number;
      per_page?: number;
    }
  >(`/api/v1/crm/leads${buildQuery(queryParams)}`);
  const data = (res.data ?? []).map(normalizeLead);
  return {
    data,
    meta: res.meta ?? {
      current_page: res.current_page ?? 1,
      last_page: res.last_page ?? 1,
      per_page: res.per_page ?? params?.per_page,
      total: res.total ?? data.length,
    },
    links: res.links,
  };
}

export async function fetchLead(
  id: number,
  options?: { skipCache?: boolean },
): Promise<ApiLeadDetail> {
  const res = await apiFetch<ApiLeadDetail | { data: ApiLeadDetail }>(
    `/api/v1/crm/leads/${id}`,
    { skipCache: options?.skipCache },
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

export type ProvisionLeadAccountResult = {
  data: {
    lead: ApiLeadDetail;
    account: ApiAccount | null;
  };
};

export async function provisionLeadAccount(
  id: number,
): Promise<ProvisionLeadAccountResult["data"]> {
  const res = await apiFetch<ProvisionLeadAccountResult>(
    `/api/v1/crm/leads/${id}/provision-account`,
    { method: "POST" },
  );
  return res.data;
}

export async function deleteLead(id: number): Promise<void> {
  await apiFetch(`/api/v1/crm/leads/${id}`, { method: "DELETE" });
}

export type ImportLeadRow = {
  name: string;
  contact_person_name?: string;
  phone?: string;
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

export type ImportHistoricalLeadRow = {
  name: string;
  phone?: string;
  progress: string;
  project_name?: string | null;
  account_name?: string | null;
  site_name?: string | null;
  source?: string | null;
  lead_source?: string | null;
  estimated_value?: number | null;
  total_quotation_amount?: number | null;
  quote_date?: string | null;
  external_quote_no?: string | null;
  quote_no?: string | null;
  series?: string | null;
  door_window_series?: string | null;
  total_sets?: string | number | null;
  total_sqm?: string | number | null;
  sales_rep?: string | null;
  customer_feedback?: string | null;
  remarks?: string | null;
};

export type ImportHistoricalLeadsResult = {
  data: {
    imported: number;
    skipped: number;
    leads: Array<{ id: number; lead_number: string; name: string }>;
    skipped_rows: Array<{
      reason: string;
      name?: string | null;
      phone?: string | null;
      external_quote_no?: string | null;
    }>;
  };
};

export async function importHistoricalLeads(
  leads: ImportHistoricalLeadRow[],
): Promise<ImportHistoricalLeadsResult> {
  return apiFetch<ImportHistoricalLeadsResult>(
    "/api/v1/crm/leads/import-historical",
    {
      method: "POST",
      json: { leads },
    },
  );
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

export async function uploadLeadPhoto(
  leadId: number,
  file: File,
  options?: { caption?: string; sort_order?: number },
): Promise<{ data: { id: number; url?: string | null } }> {
  await ensureCsrfCookie();

  const form = new FormData();
  form.append("file", file);
  if (options?.caption) form.append("caption", options.caption);
  if (options?.sort_order != null) {
    form.append("sort_order", String(options.sort_order));
  }

  return apiFetch(`/api/v1/crm/leads/${leadId}/photos`, {
    method: "POST",
    body: form,
  });
}
