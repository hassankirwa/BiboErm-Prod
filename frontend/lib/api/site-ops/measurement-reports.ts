import { apiFetch } from "../client";
import { unwrapResource } from "../crm/types";
import type { PaginatedMeta, PaginatedResponse } from "../crm/types";

export type ApiMeasurementReport = {
  id: number;
  report_number: string | null;
  status: string | null;
  site_visit_id: number | null;
  lead_id: number | null;
  approved_at: string | null;
  pdf_path: string | null;
  excel_path: string | null;
  photos_zip_path: string | null;
  site_visit?: {
    id: number;
    visit_number: string | null;
    title: string | null;
    status: string | null;
  } | null;
  design_job?: {
    id: number;
    design_job_number: string | null;
    status: string | null;
  } | null;
};

export type MeasurementPackageDownload = {
  status: string;
  report_number: string;
  message?: string;
  paths: {
    pdf: string | null;
    excel: string | null;
    photos_zip: string | null;
  };
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

export async function fetchMeasurementReports(params?: {
  status?: string;
  lead_id?: number;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiMeasurementReport>> {
  const res = await apiFetch<
    PaginatedResponse<ApiMeasurementReport> & PaginatedMeta
  >(`/api/v1/site-ops/measurement-reports${buildQuery(params)}`);

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

export async function fetchMeasurementReport(id: number): Promise<ApiMeasurementReport> {
  const res = await apiFetch<ApiMeasurementReport | { data: ApiMeasurementReport }>(
    `/api/v1/site-ops/measurement-reports/${id}`,
  );
  return unwrapResource(res);
}

export async function downloadMeasurementReportPackage(
  id: number,
): Promise<MeasurementPackageDownload> {
  const res = await apiFetch<
    MeasurementPackageDownload | { data: MeasurementPackageDownload }
  >(`/api/v1/site-ops/measurement-reports/${id}/download`, {
    method: "GET",
  });
  return unwrapResource(res);
}
