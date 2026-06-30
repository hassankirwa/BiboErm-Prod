import { apiFetch } from "../client";
import type { ApiQuotation } from "../crm/types";
import type { PaginatedResponse } from "../crm/types";
import { unwrapResource } from "../crm/types";
import type { ExchangeRateInfo } from "@/lib/currency/usd-to-kes";

export type PendingQuotationAccount = {
  id: number;
  name: string;
  account_number: string | null;
  status: string | null;
  primary_contact: { id: number; name: string } | null;
  source_lead_id: number | null;
  latest_approved_visit: {
    id: number;
    visit_number: string | null;
    approved_at: string | null;
  } | null;
  has_design_document: boolean;
  has_accounting_document: boolean;
  design_document?: { id: number; filename: string } | null;
  accounting_document?: { id: number; filename: string } | null;
  latest_design_job_id?: number | null;
  draft_quotations_count: number;
  has_quotation?: boolean;
  latest_quotation?: {
    id: number;
    quotation_number: string | null;
    status: string;
    project_name: string | null;
    project_number: string | null;
    design_job_id: number | null;
  } | null;
};

export type AccountingDrawingMetadata = {
  elevation?: {
    width_mm?: number | null;
    height_mm?: number | null;
    source?: string | null;
  };
  embedded_media?: {
    status?: string;
    files?: string[];
    data_url?: string | null;
    mime_type?: string | null;
    note?: string | null;
  } | null;
};

export type AccountingLineMetadata = {
  layout?: "tabular" | "cost_section" | null;
  currency?: "USD" | "KES" | string | null;
  usd_per_sqm?: number | null;
  line_total_usd?: number | null;
  unit_price_usd?: number | null;
  unit_price_kes?: number | null;
  fx_rate?: number | null;
  material_cost_usd?: number | null;
  glass_cost_usd?: number | null;
  hardware_cost_usd?: number | null;
  in_colour?: string | null;
  out_colour?: string | null;
  location?: string | null;
  mark?: string | null;
  source_price?: number | null;
  vat_amount?: number | null;
  commission_amount?: number | null;
  profit_amount?: number | null;
  cost_breakdown?: Record<string, unknown> | null;
  drawing?: AccountingDrawingMetadata | null;
};

export type QuotationAccountingLine = {
  description: string;
  series?: string | null;
  code?: string | null;
  glass_type?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  sqm_per_pcs?: number | null;
  total_sqm?: number | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  picture_data_url?: string | null;
  metadata?: {
    accounting?: AccountingLineMetadata;
    fabrication?: FabricationItem;
    [key: string]: unknown;
  } | null;
};

export type QuotationAccountingExtractionResult = {
  project: {
    name: string | null;
    order_no: string | null;
  };
  project_name: string | null;
  project_number: string | null;
  lines: QuotationAccountingLine[];
  summary: {
    total_items: number;
    subtotal: number;
    source_filename: string | null;
  };
};

export type FabricationProfile = {
  name?: string | null;
  code_no?: string | null;
  length_mm?: number | null;
  qty?: number | null;
  corner?: string | null;
  mark?: string | null;
};

export type FabricationHardware = {
  name?: string | null;
  specification?: string | null;
  unit?: string | null;
  qty?: number | null;
  purpose?: string | null;
  mark?: string | null;
};

export type FabricationGlass = {
  name?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  qty?: number | null;
  specification?: string | null;
  mark?: string | null;
};

export type FabricationSashOpening = {
  type?: string | null;
  opening?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  qty?: number | null;
  mark?: string | null;
};

export type FabricationItem = {
  code: string;
  series?: string | null;
  quantity?: number;
  colour?: string | null;
  project?: {
    name?: string | null;
    order_no?: string | null;
    delivery_date?: string | null;
    delivery_date_iso?: string | null;
  };
  dimensions?: {
    width_mm?: number | null;
    height_mm?: number | null;
    sqm?: number | null;
    weight_kg?: number | null;
    sill_height?: number | null;
    source?: string | null;
  };
  glass?: FabricationGlass[];
  frame_profiles?: FabricationProfile[];
  sash_profiles?: FabricationProfile[];
  hardware?: FabricationHardware[];
  sash_openings?: FabricationSashOpening[];
  packaging?: {
    notes?: string[];
    page?: number;
    total_pages?: number;
  } | null;
  drawing?: {
    elevation?: {
      width_mm?: number | null;
      height_mm?: number | null;
      source?: string | null;
    };
    embedded_media?: {
      status?: string;
      files?: string[];
      data_url?: string | null;
      mime_type?: string | null;
      note?: string | null;
    } | null;
  } | null;
  quotation_line?: QuotationExtractedLine;
};

export type QuotationExtractedLine = {
  project_name?: string | null;
  project_number?: string | null;
  series?: string | null;
  code?: string | null;
  glass_type?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  sqm_per_pcs?: number | null;
  quantity?: number;
  total_sqm?: number | null;
  unit_price?: number;
  description?: string;
  metadata?: {
    fabrication?: FabricationItem;
    [key: string]: unknown;
  } | null;
};

export type FabricationExtractionResult = {
  project: {
    name: string | null;
    order_no: string | null;
    delivery_date: string | null;
    delivery_date_iso?: string | null;
  };
  items: FabricationItem[];
  project_name: string | null;
  project_number: string | null;
  lines: QuotationExtractedLine[];
  summary: {
    total_items: number;
    source_filename: string | null;
  };
};

export type QuotationExtractionResult = QuotationAccountingExtractionResult;

export type StructuredQuotationLinePayload = {
  description: string;
  series?: string | null;
  code?: string | null;
  glass_type?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  sqm_per_pcs?: number | null;
  total_sqm?: number | null;
  quantity: number;
  unit_price: number;
  line_total?: number;
  picture_data_url?: string | null;
  metadata?: {
    accounting?: AccountingLineMetadata;
    fabrication?: FabricationItem;
    [key: string]: unknown;
  } | null;
  sort_order?: number;
};

export type CreateWorkspaceQuotationPayload = {
  account_id: number;
  contact_id?: number;
  project_name?: string;
  project_number?: string;
  valid_until?: string;
  terms_conditions?: string;
  discount_amount?: number;
  tax_amount?: number;
  tax_rate?: number;
  lines: StructuredQuotationLinePayload[];
};

export type QuotationPreviewData = {
  quotation: ApiQuotation;
  bank_details: {
    account_name: string;
    account_number_kes: string;
    account_number_usd: string;
    bank_name: string;
    branch: string;
  };
  company: {
    name: string;
    title: string;
  };
};

export async function fetchPendingQuotationAccounts(): Promise<PendingQuotationAccount[]> {
  const res = await apiFetch<{ data: PendingQuotationAccount[] }>(
    "/api/v1/projects/quotations/pending",
  );
  return res.data ?? [];
}

export async function fetchQuotationFormAccounts(options?: {
  includeAccountId?: number | null;
  includeDesignJobId?: number | null;
}): Promise<PendingQuotationAccount[]> {
  const search = new URLSearchParams();
  if (options?.includeAccountId != null) {
    search.set("include_account_id", String(options.includeAccountId));
  }
  if (options?.includeDesignJobId != null) {
    search.set("include_design_job_id", String(options.includeDesignJobId));
  }
  const query = search.toString();

  const res = await apiFetch<{ data: PendingQuotationAccount[] }>(
    `/api/v1/projects/quotations/form-accounts${query ? `?${query}` : ""}`,
  );
  return res.data ?? [];
}

export async function fetchWorkspaceQuotations(params?: {
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiQuotation>> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.per_page) search.set("per_page", String(params.per_page));
  const q = search.toString();

  return apiFetch<PaginatedResponse<ApiQuotation>>(
    `/api/v1/projects/quotations${q ? `?${q}` : ""}`,
  );
}

export type FabricationPrefillResult = FabricationExtractionResult & {
  design_document?: { id: number; filename: string } | null;
};

export async function extractQuotationExcel(
  file: File,
  fabricationFile?: File | null,
  accountId?: number | null,
): Promise<QuotationAccountingExtractionResult> {
  const form = new FormData();
  form.append("file", file);
  if (fabricationFile) {
    form.append("fabrication_file", fabricationFile);
  } else if (accountId) {
    form.append("account_id", String(accountId));
  }

  const res = await apiFetch<{ data: QuotationAccountingExtractionResult }>(
    "/api/v1/projects/quotations/extract",
    { method: "POST", body: form },
  );

  return res.data;
}

export async function fetchFabricationFromAccount(
  accountId: number,
): Promise<FabricationPrefillResult> {
  const res = await apiFetch<{ data: FabricationPrefillResult }>(
    `/api/v1/projects/quotations/fabrication-from-account/${accountId}`,
    { method: "POST" },
  );
  return res.data;
}

export async function extractQuotationFromAccount(
  accountId: number,
): Promise<QuotationAccountingExtractionResult> {
  const res = await apiFetch<{ data: QuotationAccountingExtractionResult }>(
    `/api/v1/projects/quotations/extract-from-account/${accountId}`,
    { method: "POST" },
  );
  return res.data;
}

export async function createWorkspaceQuotation(
  payload: CreateWorkspaceQuotationPayload,
  file?: File | null,
  fabricationFile?: File | null,
): Promise<ApiQuotation> {
  if (file || fabricationFile) {
    const form = new FormData();
    form.append("account_id", String(payload.account_id));
    if (payload.project_name) form.append("project_name", payload.project_name);
    if (payload.project_number) form.append("project_number", payload.project_number);
    if (payload.valid_until) form.append("valid_until", payload.valid_until);
    if (payload.terms_conditions) form.append("terms_conditions", payload.terms_conditions);
    if (payload.tax_rate != null) form.append("tax_rate", String(payload.tax_rate));
    form.append("lines", JSON.stringify(payload.lines));
    if (file) form.append("file", file);
    if (fabricationFile) form.append("fabrication_file", fabricationFile);

    const res = await apiFetch<{ data: ApiQuotation }>("/api/v1/projects/quotations", {
      method: "POST",
      body: form,
    });
    return unwrapResource(res);
  }

  const res = await apiFetch<{ data: ApiQuotation }>("/api/v1/projects/quotations", {
    method: "POST",
    json: payload,
  });
  return unwrapResource(res);
}

export async function fetchWorkspaceQuotation(
  id: number,
  options?: { includeHistory?: boolean },
): Promise<ApiQuotation> {
  const query = options?.includeHistory ? "?include=history" : "";
  const res = await apiFetch<{ data: ApiQuotation }>(
    `/api/v1/projects/quotations/${id}${query}`,
  );
  return unwrapResource(res);
}

export async function appendWorkspaceQuotationNegotiationNote(
  id: number,
  body: string,
): Promise<ApiQuotation> {
  const res = await apiFetch<{ data: ApiQuotation }>(
    `/api/v1/projects/quotations/${id}/negotiation-notes`,
    { method: "POST", json: { body } },
  );
  return unwrapResource(res);
}

export async function reviseWorkspaceQuotation(id: number): Promise<ApiQuotation> {
  const res = await apiFetch<{ data: ApiQuotation }>(
    `/api/v1/projects/quotations/${id}/revise`,
    { method: "POST", json: {} },
  );
  return unwrapResource(res);
}

export async function updateWorkspaceQuotation(
  id: number,
  payload: Partial<CreateWorkspaceQuotationPayload>,
): Promise<ApiQuotation> {
  const res = await apiFetch<{ data: ApiQuotation }>(`/api/v1/projects/quotations/${id}`, {
    method: "PATCH",
    json: payload,
  });
  return unwrapResource(res);
}

export async function fetchQuotationPreview(id: number): Promise<QuotationPreviewData> {
  const res = await apiFetch<{ data: QuotationPreviewData }>(
    `/api/v1/projects/quotations/${id}/preview`,
  );
  return res.data;
}

export function quotationLineTotal(line: ApiQuotationLine): number {
  const raw = line.line_total ?? Number(line.quantity) * Number(line.unit_price);
  return typeof raw === "string" ? parseFloat(raw) || 0 : raw ?? 0;
}

export function formatKes(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(num)) return "KES 0.00";
  return `KES ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUsd(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(num)) return "USD 0.00";
  return `USD ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchExchangeRate(from = "USD", to = "KES"): Promise<ExchangeRateInfo> {
  const res = await apiFetch<{ data: ExchangeRateInfo }>(
    `/api/v1/lookups/exchange-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return res.data;
}
