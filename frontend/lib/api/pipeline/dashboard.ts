import { apiFetch } from "../client";
import { unwrapResource } from "../crm/types";

export type PipelineDashboardData = {
  open_leads: number;
  site_visits_today: number;
  measurements_submitted: number;
  design_jobs_pending: number;
  ready_for_quotation: number;
  proforma_quotations_sent: number;
  awaiting_deposit: number;
  pipeline_value: number;
  open_deals: number;
};

export async function fetchPipelineDashboard(): Promise<PipelineDashboardData> {
  const res = await apiFetch<
    PipelineDashboardData | { data: PipelineDashboardData }
  >("/api/v1/pipeline/dashboard");
  return unwrapResource(res);
}
