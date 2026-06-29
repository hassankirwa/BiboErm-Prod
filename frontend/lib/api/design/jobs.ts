import { apiFetch, ensureCsrfCookie } from "../client";
import { unwrapResource } from "../crm/types";
import type { PaginatedMeta, PaginatedResponse } from "../crm/types";

export type DesignJobStatus =
  | "design_required"
  | "assigned"
  | "package_downloaded"
  | "wincad_in_progress"
  | "files_uploaded"
  | "design_review"
  | "approved"
  | "ready_for_quotation";

export type ApiDesignJob = {
  id: number;
  design_job_number: string | null;
  lead_id: number | null;
  site_visit_id: number | null;
  measurement_report_id: number | null;
  assigned_designer_id: number | null;
  status: DesignJobStatus | string;
  downloaded_at: string | null;
  design_started_at: string | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  review_notes: string | null;
  files_count: number | null;
  extracted_items_count: number | null;
  lead?: {
    id: number;
    name: string | null;
    reference: string | null;
  } | null;
  assigned_designer?: { id: number; name: string | null } | null;
  measurement_report?: {
    id: number;
    report_number: string | null;
  } | null;
};

export type WincadExtractionResult = {
  project: {
    name: string | null;
    order_no: string | null;
    delivery_date: string | null;
  };
  items: Array<Record<string, unknown>>;
  summary: {
    total_items: number;
    source_filename: string | null;
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

export async function fetchDesignJobs(params?: {
  status?: string;
  lead_id?: number;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiDesignJob>> {
  const res = await apiFetch<PaginatedResponse<ApiDesignJob> & PaginatedMeta>(
    `/api/v1/design/jobs${buildQuery(params)}`,
  );

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

export async function fetchDesignJob(id: number): Promise<ApiDesignJob> {
  const res = await apiFetch<ApiDesignJob | { data: ApiDesignJob }>(
    `/api/v1/design/jobs/${id}`,
  );
  return unwrapResource(res);
}

export async function assignDesignJob(
  id: number,
  assignedDesignerId: number,
): Promise<ApiDesignJob> {
  await ensureCsrfCookie();
  const res = await apiFetch<ApiDesignJob | { data: ApiDesignJob }>(
    `/api/v1/design/jobs/${id}/assign`,
    {
      method: "POST",
      json: { assigned_designer_id: assignedDesignerId },
    },
  );
  return unwrapResource(res);
}

export async function downloadDesignJobPackage(id: number): Promise<unknown> {
  await ensureCsrfCookie();
  const res = await apiFetch<{ data: unknown }>(
    `/api/v1/design/jobs/${id}/download-package`,
    { method: "POST" },
  );
  return res.data;
}

export async function approveDesignJob(
  id: number,
  reviewNotes?: string,
): Promise<ApiDesignJob> {
  await ensureCsrfCookie();
  const res = await apiFetch<ApiDesignJob | { data: ApiDesignJob }>(
    `/api/v1/design/jobs/${id}/approve`,
    {
      method: "POST",
      json: { review_notes: reviewNotes ?? null },
    },
  );
  return unwrapResource(res);
}

export async function extractWincadFile(file: File): Promise<WincadExtractionResult> {
  await ensureCsrfCookie();
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<
    WincadExtractionResult | { data: WincadExtractionResult }
  >("/api/v1/design/extract", {
    method: "POST",
    body: form,
  });
  return unwrapResource(res);
}

export const DESIGN_JOB_STATUS_LABELS: Record<string, string> = {
  design_required: "Design Required",
  assigned: "Assigned",
  package_downloaded: "Package Downloaded",
  wincad_in_progress: "WINCAD In Progress",
  files_uploaded: "Files Uploaded",
  design_review: "Design Review",
  approved: "Approved",
  ready_for_quotation: "Ready for Quotation",
};

export function designJobStatusLabel(status: string | null | undefined): string {
  const key = (status ?? "").toLowerCase();
  return DESIGN_JOB_STATUS_LABELS[key] ?? key.replace(/_/g, " ");
}
