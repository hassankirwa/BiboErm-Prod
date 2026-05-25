import { apiFetch } from "../client";
import type { ApiDeal, BiboDealStage, PaginatedResponse } from "./types";
import { unwrapResource } from "./types";

export type { ApiDeal, BiboDealStage } from "./types";

export const BIBO_DEAL_STAGES: { id: BiboDealStage; label: string }[] = [
  { id: "new_deal", label: "New Deal" },
  { id: "site_visit_pending", label: "Site Visit Pending" },
  { id: "measurements_completed", label: "Measurements Completed" },
  { id: "quotation_preparation", label: "Quotation Preparation" },
  { id: "quotation_sent", label: "Quotation Sent" },
  { id: "negotiation_revision", label: "Negotiation / Revision" },
  { id: "accepted", label: "Accepted" },
  { id: "deposit_pending", label: "Deposit Pending" },
  { id: "deposit_recorded", label: "Deposit Recorded" },
  { id: "won", label: "Won" },
  { id: "project_created", label: "Project Created" },
  { id: "lost", label: "Lost" },
];

export type RecordPaymentPayload = {
  payment_reference: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  payment_status?: string;
  quotation_id?: number;
  proof_file_path?: string;
  proof_firebase_url?: string;
  notes?: string;
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

export function dealValue(deal: ApiDeal): number {
  const raw =
    deal.final_agreed_amount ??
    deal.quotation_amount ??
    deal.estimated_value ??
    deal.amount ??
    0;
  return typeof raw === "string" ? parseFloat(raw) || 0 : raw ?? 0;
}

export async function fetchDeals(params?: {
  stage?: string;
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiDeal>> {
  return apiFetch<PaginatedResponse<ApiDeal>>(
    `/api/v1/crm/deals${buildQuery(params)}`,
  );
}

export async function fetchDeal(id: number): Promise<ApiDeal> {
  const res = await apiFetch<ApiDeal | { data: ApiDeal }>(`/api/v1/crm/deals/${id}`);
  return unwrapResource(res);
}

export async function updateDealStage(
  id: number,
  stage: string,
): Promise<ApiDeal> {
  return apiFetch<ApiDeal>(`/api/v1/crm/deals/${id}/stage`, {
    method: "PATCH",
    json: { stage },
  });
}

export async function markDealWon(
  id: number,
  options?: { override_deposit?: boolean },
): Promise<ApiDeal> {
  return apiFetch<ApiDeal>(`/api/v1/crm/deals/${id}/mark-won`, {
    method: "POST",
    json: options ?? {},
  });
}

export async function markDealLost(
  id: number,
  payload?: {
    loss_reason_id?: number;
    loss_notes?: string;
    lost_reason?: string;
  },
): Promise<ApiDeal> {
  return apiFetch<ApiDeal>(`/api/v1/crm/deals/${id}/mark-lost`, {
    method: "POST",
    json: payload ?? {},
  });
}

export async function recordPayment(
  dealId: number,
  payload: RecordPaymentPayload,
): Promise<{ data: { payment: unknown; deal: ApiDeal } }> {
  return apiFetch(`/api/v1/crm/deals/${dealId}/payments`, {
    method: "POST",
    json: payload,
  });
}

export async function createProjectFromDeal(
  id: number,
): Promise<{ data: { deal: ApiDeal; project: { id: number; name?: string } } }> {
  return apiFetch(`/api/v1/crm/deals/${id}/create-project`, {
    method: "POST",
    json: {},
  });
}
