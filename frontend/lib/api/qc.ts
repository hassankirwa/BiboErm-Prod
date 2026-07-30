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

export const QC_INSPECTION_CONTEXTS = [
  "warehouse_receiving",
  "warehouse_accessories_audit",
  "warehouse_aluminium_audit",
  "warehouse_rubbers_audit",
  "tools_periodic",
  "production_qc_pre_check",
  "production_qc_post_fabrication",
  "production_in_process",
  "site_installation",
  "snagging_signoff",
] as const;

export type QcInspectionContext = (typeof QC_INSPECTION_CONTEXTS)[number];

export type QcInspectionResult = "pending" | "pass" | "fail" | "conditional_pass" | "skipped";

/** Results the inspector may choose when submitting (excludes pending). */
export const QC_INSPECTION_SUBMIT_RESULTS = [
  "pass",
  "fail",
  "conditional_pass",
] as const;

export type QcInspectionSubmitResult = (typeof QC_INSPECTION_SUBMIT_RESULTS)[number];

export const QC_INSPECTION_RESULT_LABELS: Record<QcInspectionSubmitResult, string> = {
  pass: "Pass",
  fail: "Fail",
  conditional_pass: "Conditional pass",
};
export type QcDefectSeverity = "critical" | "major" | "minor";
export type QcDefectStatus = "open" | "in_progress" | "resolved" | "waived";
export type QcScheduleFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly";

export type QcChecklistTemplateItem = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  help_text?: string | null;
  sort_order?: number;
  min?: number;
  max?: number;
};

/** @deprecated Use QcChecklistTemplateItem */
export type QcChecklistItem = QcChecklistTemplateItem;

export type QcProjectSummary = {
  id: number;
  reference: string;
  name: string;
  stage?: string;
  priority?: string;
  completion_percent?: number;
  site_address?: string | null;
  type?: string;
  location_type?: string;
  project_manager?: { id: number; name: string; email?: string } | null;
  account?: { id: number; name: string } | null;
};

export type QcChecklistTemplate = {
  id: number;
  name: string;
  context: QcInspectionContext;
  stage?: string | null;
  description?: string | null;
  items: QcChecklistTemplateItem[];
  is_active: boolean;
  is_system: boolean;
  project_id?: number | null;
  parent_template_id?: number | null;
  version?: number;
  created_at?: string | null;
  updated_at?: string | null;
  project?: QcProjectSummary | null;
};

export type QcInspectionPhoto = {
  id: number;
  inspection_id?: number;
  checklist_key?: string | null;
  defect_id?: number | null;
  file_path: string;
  firebase_url?: string | null;
  url?: string | null;
  caption?: string | null;
  created_at?: string | null;
};

export type QcDefect = {
  id: number;
  inspection_id: number;
  checklist_key?: string | null;
  severity: QcDefectSeverity;
  description: string;
  status: QcDefectStatus;
  resolution_notes?: string | null;
  reported_by?: number | null;
  photo_paths?: string[] | null;
  resolved_at?: string | null;
  created_at?: string | null;
  inspection?: {
    id: number;
    reference: string;
    context: QcInspectionContext | string;
    project_id?: number | null;
    goods_receipt_id?: number | null;
    project?: { id: number; reference: string; name: string } | null;
  } | null;
  reported_by_user?: { id: number; name: string } | null;
};

export type QcInspection = {
  id: number;
  reference: string;
  context: QcInspectionContext;
  result: QcInspectionResult;
  can_skip?: boolean;
  stage?: string | null;
  project_id?: number | null;
  production_order_id?: number | null;
  goods_receipt_id?: number | null;
  field_installation_job_id?: number | null;
  template_id?: number | null;
  warehouse_deck_slug?: string | null;
  warehouse_section_id?: number | null;
  tool_id?: number | null;
  inspector_id?: number | null;
  checklist_responses?: Record<string, unknown> | null;
  custom_items?: QcChecklistTemplateItem[];
  notes?: string | null;
  internal_notes?: string | null;
  inspected_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  project?: QcProjectSummary | null;
  inspector?: { id: number; name: string; email?: string } | null;
  template?: QcChecklistTemplate | null;
  defects?: QcDefect[];
  photos?: QcInspectionPhoto[];
  defects_count?: number;
};

export type QcInspectionSchedule = {
  id: number;
  name: string;
  context: QcInspectionContext;
  frequency: QcScheduleFrequency | string;
  frequency_interval: number;
  warehouse_deck_slug?: string | null;
  warehouse_section_id?: number | null;
  tool_scope?: string | null;
  assigned_role?: string | null;
  assigned_user_id?: number | null;
  template_id?: number | null;
  next_due_at: string;
  last_run_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  template?: QcChecklistTemplate | null;
  assigned_user?: { id: number; name: string } | null;
};

/** @deprecated Use QcInspectionSchedule */
export type QcSchedule = QcInspectionSchedule;

export type QcDashboardSummary = {
  open_defects_count: number;
  due_schedules_count: number;
  fail_rate_percent?: number | null;
  fail_rate_30d?: number | null;
  inspections_this_week?: number;
  pending_inspections_count?: number;
  open_defects?: QcDefect[];
  due_schedules?: QcInspectionSchedule[];
  fail_rate_trend?: Array<{ period: string; fail_rate: number }>;
};

export const QC_CONTEXT_LABELS: Record<QcInspectionContext, string> = {
  warehouse_receiving: "GRN Receiving",
  warehouse_accessories_audit: "Accessories audit",
  warehouse_aluminium_audit: "Aluminium audit",
  warehouse_rubbers_audit: "Rubbers audit",
  tools_periodic: "Tools periodic",
  production_qc_pre_check: "Pre-cutting QC",
  production_qc_post_fabrication: "Post-fabrication QC",
  production_in_process: "In-process QC",
  site_installation: "Site installation",
  snagging_signoff: "Snagging sign-off",
};

export const PRODUCTION_IN_PROCESS_STAGES = [
  { value: "cutting", label: "Cutting" },
  { value: "fabrication", label: "Fabrication" },
  { value: "sash", label: "Sash fabrication" },
  { value: "glass_assembly", label: "Glass assembly" },
  { value: "finishing", label: "Finishing" },
] as const;

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const q = search.toString();
  return q ? `?${q}` : "";
}

// Templates
export async function listQcTemplates(params?: {
  context?: QcInspectionContext | string;
  project_id?: number;
  per_page?: number;
}) {
  return apiRequest<Paginated<QcChecklistTemplate>>(`/qc/templates${buildQuery(params)}`);
}

export async function getQcTemplate(id: number) {
  return apiRequest<{ data: QcChecklistTemplate }>(`/qc/templates/${id}`);
}

export async function createQcTemplate(payload: {
  name: string;
  context: QcInspectionContext;
  description?: string | null;
  items: QcChecklistTemplateItem[];
  project_id?: number | null;
  is_active?: boolean;
}) {
  return apiRequest<{ data: QcChecklistTemplate }>("/qc/templates", {
    method: "POST",
    body: payload,
  });
}

export async function updateQcTemplate(
  id: number,
  payload: Partial<{
    name: string;
    description: string | null;
    items: QcChecklistTemplateItem[];
    is_active: boolean;
  }>,
) {
  return apiRequest<{ data: QcChecklistTemplate }>(`/qc/templates/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function cloneQcTemplate(
  id: number,
  payload: { project_id: number; name?: string },
) {
  return apiRequest<{ data: QcChecklistTemplate }>(`/qc/templates/${id}/clone`, {
    method: "POST",
    body: payload,
  });
}

// Inspections
export async function listQcInspections(params?: {
  context?: QcInspectionContext | string;
  project_id?: number;
  result?: QcInspectionResult | string;
  goods_receipt_id?: number;
  production_order_id?: number;
  field_installation_job_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
}) {
  return apiRequest<Paginated<QcInspection>>(`/qc/inspections${buildQuery(params)}`);
}

export async function getQcInspection(id: number) {
  return apiRequest<{ data: QcInspection }>(`/qc/inspections/${id}`);
}

export async function createQcInspection(payload: {
  context: QcInspectionContext;
  template_id?: number | null;
  project_id?: number | null;
  production_order_id?: number | null;
  goods_receipt_id?: number | null;
  field_installation_job_id?: number | null;
  warehouse_deck_slug?: string | null;
  warehouse_section_id?: number | null;
  tool_id?: number | null;
  stage?: string | null;
  notes?: string | null;
}) {
  return apiRequest<{ data: QcInspection }>("/qc/inspections", {
    method: "POST",
    body: payload,
  });
}

export async function updateQcInspection(
  id: number,
  payload: {
    checklist_responses?: Record<string, unknown>;
    custom_items?: QcChecklistTemplateItem[];
    notes?: string | null;
    internal_notes?: string | null;
  },
) {
  return apiRequest<{ data: QcInspection }>(`/qc/inspections/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

/** Alias for draft saves */
export const updateQcInspectionDraft = updateQcInspection;

export async function submitQcInspection(
  id: number,
  payload: {
    result: QcInspectionSubmitResult;
    checklist_responses?: Record<string, unknown>;
    notes?: string | null;
  },
) {
  return apiRequest<{ data: QcInspection }>(`/qc/inspections/${id}/submit`, {
    method: "POST",
    body: payload,
  });
}

export async function skipQcInspection(id: number, notes?: string | null) {
  return apiRequest<{ data: QcInspection }>(`/qc/inspections/${id}/skip`, {
    method: "POST",
    body: notes ? { notes } : {},
  });
}

export async function uploadQcInspectionPhoto(
  id: number,
  fileOrFormData: File | FormData,
  opts?: { checklist_key?: string; defect_id?: number; caption?: string },
) {
  const formData =
    fileOrFormData instanceof FormData
      ? fileOrFormData
      : (() => {
          const form = new FormData();
          form.append("file", fileOrFormData);
          if (opts?.checklist_key) form.append("checklist_key", opts.checklist_key);
          if (opts?.defect_id) form.append("defect_id", String(opts.defect_id));
          if (opts?.caption) form.append("caption", opts.caption);
          return form;
        })();

  return apiRequest<{ data: QcInspectionPhoto }>(`/qc/inspections/${id}/photos`, {
    method: "POST",
    formData,
  });
}

// Defects
export async function listQcDefects(params?: {
  status?: QcDefectStatus | string;
  severity?: QcDefectSeverity | string;
  project_id?: number;
  inspection_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
}) {
  return apiRequest<Paginated<QcDefect>>(`/qc/defects${buildQuery(params)}`);
}

export async function createQcDefect(
  inspectionId: number,
  payload: {
    severity: QcDefectSeverity | string;
    description: string;
    checklist_key?: string | null;
  },
) {
  return apiRequest<{ data: QcDefect }>(`/qc/inspections/${inspectionId}/defects`, {
    method: "POST",
    body: payload,
  });
}

export async function updateQcDefect(
  id: number,
  payload: {
    status?: QcDefectStatus | string;
    resolution_notes?: string | null;
  },
) {
  return apiRequest<{ data: QcDefect }>(`/qc/defects/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

// Schedules
export async function listQcSchedules(params?: { is_active?: boolean; per_page?: number }) {
  return apiRequest<Paginated<QcInspectionSchedule>>(`/qc/schedules${buildQuery(params)}`);
}

export async function createQcSchedule(payload: {
  name: string;
  context: QcInspectionContext;
  frequency: QcScheduleFrequency | string;
  frequency_interval?: number;
  warehouse_deck_slug?: string | null;
  warehouse_section_id?: number | null;
  tool_scope?: string | null;
  assigned_role?: string | null;
  assigned_user_id?: number | null;
  template_id?: number | null;
  next_due_at: string;
  is_active?: boolean;
}) {
  return apiRequest<{ data: QcInspectionSchedule }>("/qc/schedules", {
    method: "POST",
    body: payload,
  });
}

export async function updateQcSchedule(
  id: number,
  payload: Partial<{
    name: string;
    frequency: QcScheduleFrequency | string;
    frequency_interval: number;
    assigned_user_id: number | null;
    template_id: number | null;
    next_due_at: string;
    is_active: boolean;
  }>,
) {
  return apiRequest<{ data: QcInspectionSchedule }>(`/qc/schedules/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

// Dashboard
export async function getQcDashboardSummary() {
  return apiRequest<{ data: QcDashboardSummary }>("/qc/dashboard/summary");
}
