import { API_URL } from "../config";
import { getCsrfTokenFromCookie } from "../csrf";
import { getDeviceUuid } from "../device";
import { apiFetch } from "../client";

export type CrmReport = {
  id: string;
  name: string;
  description: string;
  folder: string;
  record_count?: number;
};

export type CrmReportDashboardKpis = {
  total_leads: number;
  open_leads: number;
  converted_leads: number;
  lead_conversion_rate: number;
  open_deals: number;
  deals_created: number;
  pipeline_value: number;
  won_deals: number;
  lost_deals: number;
  won_revenue: number;
  win_rate: number;
  avg_deal_size: number;
  quotations_sent: number;
  quotations_accepted: number;
  activities_total: number;
  activities_completed: number;
  site_visits: number;
  payments_received: number;
};

export type CrmReportDashboard = {
  period: { from: string; to: string };
  filters: { owner_id: number | null };
  kpis: CrmReportDashboardKpis;
  pipeline_by_stage: {
    stage: string;
    label: string;
    count: number;
    value: number;
  }[];
  leads_by_status: { status: string; label: string; count: number }[];
  leads_by_source: { source: string; label: string; count: number }[];
  activities_by_type: { type: string; label: string; count: number }[];
  quotations_by_status: {
    status: string;
    label: string;
    count: number;
    value: number;
  }[];
  top_performers: {
    owner_id: number | null;
    name: string;
    won_deals: number;
    revenue: number;
  }[];
};

export type CrmReportDashboardParams = {
  from?: string;
  to?: string;
  owner_id?: string;
};

export async function fetchCrmReports(): Promise<CrmReport[]> {
  const res = await apiFetch<{ data: CrmReport[] }>("/api/v1/crm/reports");
  return res.data ?? [];
}

export async function fetchCrmReportsDashboard(
  params: CrmReportDashboardParams = {},
): Promise<CrmReportDashboard> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.owner_id) search.set("owner_id", params.owner_id);

  const query = search.toString();
  const path = query
    ? `/api/v1/crm/reports/dashboard?${query}`
    : "/api/v1/crm/reports/dashboard";

  const res = await apiFetch<{ data: CrmReportDashboard }>(path);
  return res.data;
}

export async function downloadCrmReportExport(reportId: string): Promise<void> {
  const headers = new Headers({
    Accept: "text/csv",
    "X-Requested-With": "XMLHttpRequest",
    "X-Device-UUID": getDeviceUuid(),
    "X-Device-Id": getDeviceUuid(),
  });

  const csrf = getCsrfTokenFromCookie();
  if (csrf) {
    headers.set("X-XSRF-TOKEN", csrf);
  }

  const res = await fetch(`${API_URL}/api/v1/crm/reports/${reportId}/export`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Could not download report export.");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] ?? `${reportId}-${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
