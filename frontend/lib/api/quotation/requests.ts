import { apiFetch } from "../client";
import { unwrapResource } from "../crm/types";
import type { PaginatedMeta, PaginatedResponse } from "../crm/types";

export type ApiQuotationRequest = {
  id: number;
  request_number: string | null;
  status: string | null;
  lead_id: number | null;
  design_job_id: number | null;
  measurement_report_id: number | null;
  assigned_quotation_user_id: number | null;
  created_at: string | null;
  quotations_count: number | null;
  lead?: {
    id: number;
    name: string | null;
    reference: string | null;
  } | null;
  assigned_quotation_user?: { id: number; name: string | null } | null;
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

export async function fetchQuotationRequests(params?: {
  status?: string;
  lead_id?: number;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiQuotationRequest>> {
  const res = await apiFetch<
    PaginatedResponse<ApiQuotationRequest> & PaginatedMeta
  >(`/api/v1/quotation/requests${buildQuery(params)}`);

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

export async function fetchQuotationRequest(id: number): Promise<ApiQuotationRequest> {
  const res = await apiFetch<ApiQuotationRequest | { data: ApiQuotationRequest }>(
    `/api/v1/quotation/requests/${id}`,
  );
  return unwrapResource(res);
}

export const QUOTATION_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function quotationRequestStatusLabel(status: string | null | undefined): string {
  const key = (status ?? "").toLowerCase();
  return QUOTATION_REQUEST_STATUS_LABELS[key] ?? key.replace(/_/g, " ");
}
