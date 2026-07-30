import { API_URL } from "./config";
import { ensureCsrfCookie, getXsrfToken } from "./csrf";

export type ClientPortalProject = {
  id: number;
  reference: string;
  client_portal_code?: string | null;
  name: string;
  stage: string;
  stage_label: string;
  completion_percent: number;
  site_address: string | null;
  projected_start: string | null;
  projected_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  project_manager?: { name: string; email: string } | null;
};

export type ClientPortalJourneyStep = {
  key: string;
  number: number;
  label: string;
  description: string;
  state: "complete" | "current" | "upcoming";
};

export type ClientPortalGalleryItem = {
  id: string;
  source: string;
  step: string;
  caption: string | null;
  taken_at: string | null;
  url: string;
  has_file: boolean;
};

export type ClientPortalProgress = {
  project: ClientPortalProject;
  journey: ClientPortalJourneyStep[];
  milestones: Array<{ stage: string; label: string; state: "complete" | "current" | "upcoming" }>;
  timeline: Array<{
    id: number;
    from_stage: string | null;
    from_stage_label: string | null;
    to_stage: string;
    to_stage_label: string;
    changed_at: string | null;
  }>;
  production: Array<{
    id: number;
    reference: string;
    status: string;
    current_stage: string | null;
    current_stage_label: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
  }>;
  qc: Array<{
    id: number;
    reference: string;
    context: string;
    result: string;
    inspected_at: string | null;
    completed_at: string | null;
  }>;
  installation: Array<{
    id: number;
    reference: string;
    job_type: string;
    status: string;
    percent_complete: string | number;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    actual_start?: string | null;
    actual_end?: string | null;
    units: Array<{ id: number; label: string; status: string; installed_at: string | null }>;
    latest_logs: Array<{ id: number; log_date: string | null; summary: string; units_completed: number }>;
  }>;
  gallery: ClientPortalGalleryItem[];
  documents: Array<{
    id: number;
    type: string;
    filename: string;
    version: number;
    url: string | null;
    created_at?: string | null;
  }>;
  delays: Array<{
    id: number;
    stage: string;
    stage_label: string;
    reason: string;
    days_lost: number | null;
    logged_at: string | null;
  }>;
};

async function publicRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const isMutating = method !== "GET" && method !== "HEAD";

  // API stack always runs ValidateCsrfToken; mutating calls need Sanctum XSRF.
  if (isMutating) {
    await ensureCsrfCookie();
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (isMutating) {
    const xsrf = getXsrfToken();
    if (xsrf) {
      headers["X-XSRF-TOKEN"] = xsrf;
    }
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

export async function requestClientPortalAccess(payload: { identifier: string; phone: string }) {
  return publicRequest<{
    data: {
      access_token: string;
      expires_at: string;
      project: ClientPortalProject;
    };
  }>("/client-portal/access", {
    method: "POST",
    body: payload,
  });
}

export async function getClientPortalProgress(projectId: number, token: string) {
  return publicRequest<{ data: ClientPortalProgress }>(
    `/client-portal/projects/${projectId}/progress`,
    { token },
  );
}
