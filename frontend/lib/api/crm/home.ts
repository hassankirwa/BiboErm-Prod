import { apiFetch } from "@/lib/api/client";
import type { ApiActivity, ApiFieldDay, ApiLead, ApiSiteVisit } from "@/lib/api/crm/types";

export type CrmHomeSummary = {
  stats: {
    leads: number;
    deals: number;
    visits: number;
    pipeline_value: number;
  };
  open_tasks: ApiActivity[];
  upcoming_visits: ApiSiteVisit[];
  recent_leads: ApiLead[];
  field_days_today: ApiFieldDay[];
};

export async function fetchCrmHomeSummary(): Promise<{ data: CrmHomeSummary }> {
  return apiFetch<{ data: CrmHomeSummary }>("/api/v1/crm/home-summary");
}
