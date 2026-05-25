import { API_URL } from "../config";
import { getDeviceUuid } from "../device";
import { apiFetch } from "../client";
import { ApiError } from "../errors";
import type { ApiQuotation } from "./types";
import { unwrapResource } from "./types";

export type { ApiQuotation, ApiQuotationLine } from "./types";

export type QuotationLinePayload = {
  description: string;
  quantity: number;
  unit_price: number;
  measurement_line_id?: number;
  sort_order?: number;
};

export type CreateQuotationPayload = {
  valid_until?: string;
  terms_conditions?: string;
  discount_amount?: number;
  tax_amount?: number;
  revision_of_id?: number;
  lines: QuotationLinePayload[];
};

function normalizeQuotation(res: ApiQuotation | { data: ApiQuotation }): ApiQuotation {
  return unwrapResource(res);
}

export async function createQuotation(
  dealId: number,
  payload: CreateQuotationPayload,
): Promise<ApiQuotation> {
  const res = await apiFetch<ApiQuotation | { data: ApiQuotation }>(
    `/api/v1/crm/deals/${dealId}/quotations`,
    {
      method: "POST",
      json: payload,
    },
  );
  return normalizeQuotation(res);
}

export async function fetchQuotation(id: number): Promise<ApiQuotation> {
  const res = await apiFetch<ApiQuotation | { data: ApiQuotation }>(
    `/api/v1/crm/quotations/${id}`,
  );
  return normalizeQuotation(res);
}

export async function sendQuotation(id: number): Promise<ApiQuotation> {
  const res = await apiFetch<ApiQuotation | { data: ApiQuotation }>(
    `/api/v1/crm/quotations/${id}/send`,
    { method: "POST", json: {} },
  );
  return normalizeQuotation(res);
}

export async function acceptQuotation(id: number): Promise<ApiQuotation> {
  const res = await apiFetch<ApiQuotation | { data: ApiQuotation }>(
    `/api/v1/crm/quotations/${id}/accept`,
    { method: "POST", json: {} },
  );
  return normalizeQuotation(res);
}

export async function reviseQuotation(
  dealId: number,
  quotationId: number,
  payload: Omit<CreateQuotationPayload, "revision_of_id">,
): Promise<ApiQuotation> {
  return createQuotation(dealId, {
    ...payload,
    revision_of_id: quotationId,
  });
}

export function quotationPdfUrl(id: number): string {
  return `${API_URL}/api/v1/crm/quotations/${id}/pdf`;
}

export async function downloadQuotationPdf(
  id: number,
  filename?: string,
): Promise<void> {
  const res = await fetch(quotationPdfUrl(id), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/pdf",
      "X-Requested-With": "XMLHttpRequest",
      "X-Device-UUID": getDeviceUuid(),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const message =
      (typeof body.message === "string" && body.message) ||
      "Could not download quotation PDF.";
    throw new ApiError(res.status, message, body);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `quotation-${id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function quotationAmount(quotation: ApiQuotation): number {
  const raw = quotation.total_amount ?? 0;
  return typeof raw === "string" ? parseFloat(raw) || 0 : raw ?? 0;
}
