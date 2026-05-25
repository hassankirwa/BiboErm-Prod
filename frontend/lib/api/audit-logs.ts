import { apiFetch } from "./client";

export type ApiAuditLog = {
  id: number;
  module: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string } | null;
  device?: { id: number; name: string; uuid: string } | null;
};

type PaginatedAuditLogs = {
  data: ApiAuditLog[];
  meta?: { current_page: number; last_page: number; total: number };
};

export async function fetchAuditLogs(params?: {
  module?: string;
  action?: string;
  user_id?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
}): Promise<PaginatedAuditLogs> {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const query = qs.toString();
  return apiFetch<PaginatedAuditLogs>(
    `/api/v1/audit-logs${query ? `?${query}` : ""}`,
  );
}
