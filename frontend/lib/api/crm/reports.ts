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

export async function fetchCrmReports(): Promise<CrmReport[]> {
  const res = await apiFetch<{ data: CrmReport[] }>("/api/v1/crm/reports");
  return res.data ?? [];
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
