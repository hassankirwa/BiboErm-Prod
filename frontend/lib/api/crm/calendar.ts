import { apiFetch } from "../client";

export type CrmCalendarEvent = {
  id: string;
  source: "crm_activity" | "site_visit" | string;
  source_id: number;
  type: string;
  title: string;
  subtitle: string | null;
  starts_at: string;
  ends_at: string;
  assigned_to: { id: number; name: string } | null;
  lead_id: number | null;
  account_id: number | null;
  deal_id: number | null;
  location: string | null;
  status: string | null;
  href: string | null;
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

export async function fetchCrmCalendarEvents(params: {
  from: string;
  to: string;
  assigned_to?: number;
  account_id?: number;
  lead_id?: number;
}): Promise<{ data: CrmCalendarEvent[] }> {
  return apiFetch<{ data: CrmCalendarEvent[] }>(
    `/api/v1/crm/calendar/events${buildQuery(params)}`,
  );
}
