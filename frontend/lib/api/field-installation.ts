import { apiRequest } from "./client";

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export type FieldInstallationJob = {
  id: number;
  reference: string;
  project_id: number;
  production_order_id: number | null;
  job_type: string;
  status: string;
  team_lead_id: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  percent_complete: string;
  site_address: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  notes: string | null;
  project?: {
    id: number;
    reference: string;
    name: string;
    install_mode: string;
    stage: string;
  };
  team_lead?: { id: number; name: string } | null;
  members?: FieldJobMember[];
  units?: FieldInstallationUnit[];
};

export type FieldJobMember = {
  id: number;
  user_id: number;
  role: string;
  user?: { id: number; name: string; email: string };
};

export type FieldInstallationUnit = {
  id: number;
  unit_label: string;
  status: string;
  installed_at: string | null;
  snag_notes: string | null;
  sort_order: number;
};

export type FieldDailyLog = {
  id: number;
  job_id: number;
  log_date: string;
  summary: string;
  units_completed: number;
  percent_today: string | null;
  weather: string | null;
  site_conditions: string | null;
  blockers: string | null;
  submitted_at: string;
};

export type FieldDeliveryRecord = {
  id: number;
  delivery_condition: string;
  received_at: string;
  vehicle_reg: string | null;
  driver_name: string | null;
  notes: string | null;
  lines?: Array<{
    id: number;
    description: string;
    qty_expected: string;
    qty_received: string;
  }>;
};

export type FieldNonConformity = {
  id: number;
  nc_type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  reported_at: string;
};

export async function listFieldJobs(params?: {
  project_id?: number;
  status?: string;
  per_page?: number;
}) {
  const search = new URLSearchParams();
  if (params?.project_id) search.set("project_id", String(params.project_id));
  if (params?.status) search.set("status", params.status);
  if (params?.per_page) search.set("per_page", String(params.per_page));
  const q = search.toString();
  return apiRequest<Paginated<FieldInstallationJob>>(
    `/field-installation/jobs${q ? `?${q}` : ""}`,
  );
}

export async function getFieldJob(id: number) {
  return apiRequest<{ data: FieldInstallationJob }>(
    `/field-installation/jobs/${id}`,
  );
}

export async function createFieldJob(payload: {
  project_id: number;
  job_type?: string;
  team_lead_id?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  site_address?: string;
  notes?: string;
}) {
  return apiRequest<{ data: FieldInstallationJob }>("/field-installation/jobs", {
    method: "POST",
    body: payload,
  });
}

export async function startFieldJob(id: number) {
  return apiRequest<{ data: FieldInstallationJob }>(
    `/field-installation/jobs/${id}/start`,
    { method: "POST" },
  );
}

export async function completeFieldJob(id: number) {
  return apiRequest<{ data: FieldInstallationJob }>(
    `/field-installation/jobs/${id}/complete`,
    { method: "POST" },
  );
}

export async function listDailyLogs(jobId: number) {
  return apiRequest<{ data: FieldDailyLog[] }>(
    `/field-installation/jobs/${jobId}/daily-logs`,
  );
}

export async function submitDailyLog(
  jobId: number,
  payload: {
    log_date: string;
    summary: string;
    units_completed?: number;
    weather?: string;
    site_conditions?: string;
    blockers?: string;
  },
) {
  return apiRequest<{ data: FieldDailyLog }>(
    `/field-installation/jobs/${jobId}/daily-logs`,
    { method: "POST", body: payload },
  );
}

export async function listDeliveries(jobId: number) {
  return apiRequest<{ data: FieldDeliveryRecord[] }>(
    `/field-installation/jobs/${jobId}/deliveries`,
  );
}

export async function recordDelivery(
  jobId: number,
  payload: {
    delivery_condition: string;
    received_at?: string;
    vehicle_reg?: string;
    driver_name?: string;
    notes?: string;
    lines?: Array<{
      description: string;
      qty_expected: number;
      qty_received: number;
      unit?: string;
    }>;
  },
) {
  return apiRequest<{ data: FieldDeliveryRecord }>(
    `/field-installation/jobs/${jobId}/deliveries`,
    { method: "POST", body: payload },
  );
}

export async function listNonConformities(jobId: number) {
  return apiRequest<{ data: FieldNonConformity[] }>(
    `/field-installation/jobs/${jobId}/non-conformities`,
  );
}

export async function reportNonConformity(
  jobId: number,
  payload: {
    nc_type: string;
    severity: string;
    title: string;
    description: string;
    qty_affected?: number;
  },
) {
  return apiRequest<{ data: FieldNonConformity }>(
    `/field-installation/jobs/${jobId}/non-conformities`,
    { method: "POST", body: payload },
  );
}

export async function updateUnit(
  unitId: number,
  payload: { status: string; snag_notes?: string },
) {
  return apiRequest<{ data: FieldInstallationUnit }>(
    `/field-installation/units/${unitId}`,
    { method: "PATCH", body: payload },
  );
}
