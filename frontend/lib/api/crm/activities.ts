import { apiFetch } from "../client";
import type { ApiActivity } from "./types";

export type { ApiActivity } from "./types";

type ActivitiesPaginated = {
  data: ApiActivity[];
  current_page?: number;
  last_page?: number;
  total?: number;
  meta?: { current_page: number; last: number; total: number };
};

export type CreateActivityPayload = {
  activity_type?: string;
  type?: string;
  subject: string;
  description?: string;
  body?: string;
  due_at?: string;
  priority?: string;
  lead_id?: number;
  contact_id?: number;
  deal_id?: number;
  assigned_to?: number;
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

export async function fetchActivities(params?: {
  lead_id?: number;
  deal_id?: number;
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<ActivitiesPaginated> {
  return apiFetch<ActivitiesPaginated>(
    `/api/v1/crm/activities${buildQuery(params)}`,
  );
}

export async function createActivity(
  payload: CreateActivityPayload,
): Promise<{ data: ApiActivity }> {
  return apiFetch<{ data: ApiActivity }>("/api/v1/crm/activities", {
    method: "POST",
    json: payload,
  });
}
