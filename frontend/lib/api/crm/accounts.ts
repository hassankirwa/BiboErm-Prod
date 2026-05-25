import { apiFetch } from "../client";
import type { ApiAccount, PaginatedResponse } from "./types";

export type { ApiAccount } from "./types";

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

export async function fetchAccounts(params?: {
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiAccount>> {
  return apiFetch<PaginatedResponse<ApiAccount>>(
    `/api/v1/crm/accounts${buildQuery(params)}`,
  );
}

export async function fetchAccount(id: number): Promise<ApiAccount> {
  return apiFetch<ApiAccount>(`/api/v1/crm/accounts/${id}`);
}
