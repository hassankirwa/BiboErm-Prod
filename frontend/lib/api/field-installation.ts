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
  project_wave_id?: number | null;
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
  wave?: {
    id: number;
    wave_number: number;
    label: string | null;
    status: string;
  } | null;
  team_lead?: { id: number; name: string } | null;
  members?: FieldJobMember[];
  units?: FieldInstallationUnit[];
  tool_assignments?: FieldToolAssignment[];
  assigned_dispatch?: {
    id: number;
    status: string;
    vehicle_reg: string | null;
    vehicle_details: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    driver: {
      id: number;
      code: string;
      name: string;
      phone: string | null;
      vehicle_registration: string | null;
    } | null;
  } | null;
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
  misfit_notes?: string | null;
  sort_order: number;
  measurement_line_key?: string | null;
  opening_ref?: string | null;
  product_type?: string | null;
  unit_floor?: string | null;
  room_location?: string | null;
  quantity?: number;
  measurement_snapshot?: {
    ref?: string | null;
    product_type?: string | null;
    unit_floor?: string | null;
    room_location?: string | null;
    width_centre_mm?: number | string | null;
    height_centre_mm?: number | string | null;
    quantity?: number;
    remarks?: string | null;
  } | null;
  photos?: FieldPhoto[];
};

export type FieldToolAssignment = {
  id: number;
  job_id: number;
  tool_issuance_id: number;
  assigned_by: number;
  expected_return_date: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at?: string | null;
  tool_issuance?: {
    id: number;
    tool_id: number;
    quantity: number;
    issued_to: number;
    issue_date: string | null;
    return_date: string | null;
    condition_out: string | null;
    condition_in: string | null;
    damage_notes: string | null;
    tool?: {
      id: number;
      tool_code: string;
      name: string;
      tool_type: string | null;
      condition: string | null;
      tracking_mode?: string;
      total_qty?: number;
      available_qty?: number;
      on_site_qty?: number;
      qty_in_repair?: number;
    } | null;
    issued_to_user?: { id: number; name: string } | null;
  } | null;
  assigned_by_user?: { id: number; name: string } | null;
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
  photos?: FieldPhoto[];
};

export type FieldDeliveryRecord = {
  id: number;
  delivery_condition: string;
  received_at: string;
  vehicle_reg: string | null;
  driver_name: string | null;
  packing_list_ref?: string | null;
  expected_units?: number | null;
  received_units?: number | null;
  notes: string | null;
  receiver?: { id: number; name: string } | null;
  lines?: Array<{
    id: number;
    description: string;
    qty_expected: string;
    qty_received: string;
    condition_notes?: string | null;
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

export type FieldPhoto = {
  id: number;
  job_id: number;
  attachable_type: string;
  attachable_id: number;
  file_path: string;
  firebase_url?: string | null;
  url?: string | null;
  caption: string | null;
  taken_at: string | null;
};

export async function listFieldJobs(params?: {
  project_id?: number;
  project_wave_id?: number;
  status?: string;
  per_page?: number;
}) {
  const search = new URLSearchParams();
  if (params?.project_id) search.set("project_id", String(params.project_id));
  if (params?.project_wave_id) search.set("project_wave_id", String(params.project_wave_id));
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
  project_wave_id?: number | null;
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

export async function holdFieldJob(id: number) {
  return apiRequest<{ data: FieldInstallationJob }>(
    `/field-installation/jobs/${id}/hold`,
    { method: "POST" },
  );
}

export async function cancelFieldJob(id: number) {
  return apiRequest<{ data: FieldInstallationJob }>(
    `/field-installation/jobs/${id}/cancel`,
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
    percent_today?: number;
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

export async function updateDailyLog(
  id: number,
  payload: Partial<{
    log_date: string;
    summary: string;
    units_completed: number;
    percent_today: number;
    weather: string;
    site_conditions: string;
    blockers: string;
  }>,
) {
  return apiRequest<{ data: FieldDailyLog }>(
    `/field-installation/daily-logs/${id}`,
    { method: "PATCH", body: payload },
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
    packing_list_ref?: string;
    expected_units?: number;
    received_units?: number;
    notes?: string;
    acknowledge_partial_without_nc?: boolean;
    skip_nc_check?: boolean;
    lines?: Array<{
      description: string;
      qty_expected: number;
      qty_received: number;
      unit?: string;
      condition_notes?: string;
    }>;
  },
) {
  return apiRequest<{ data: FieldDeliveryRecord }>(
    `/field-installation/jobs/${jobId}/deliveries`,
    { method: "POST", body: payload },
  );
}

export async function updateDelivery(
  id: number,
  payload: Partial<{
    delivery_condition: string;
    received_at: string;
    vehicle_reg: string;
    driver_name: string;
    packing_list_ref: string;
    expected_units: number;
    received_units: number;
    notes: string;
    lines: Array<{
      description: string;
      qty_expected: number;
      qty_received: number;
      unit?: string;
      condition_notes?: string;
    }>;
  }>,
) {
  return apiRequest<{ data: FieldDeliveryRecord }>(
    `/field-installation/deliveries/${id}`,
    { method: "PATCH", body: payload },
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
    field_installation_unit_id?: number;
    project_bom_line_id?: number;
    warehouse_item_id?: number;
  },
) {
  return apiRequest<{ data: FieldNonConformity }>(
    `/field-installation/jobs/${jobId}/non-conformities`,
    { method: "POST", body: payload },
  );
}

export type FieldDesignChangeResult = {
  non_conformity: FieldNonConformity;
  design_change_order: {
    id: number;
    project_id: number;
    field_non_conformity_id: number | null;
    status: string;
    reason: string | null;
    measurement_notes?: Record<string, unknown> | null;
    scope_bom_line_ids?: number[] | null;
    parent_production_order_id?: number | null;
    remake_production_order_id?: number | null;
    requested_by?: number | null;
    approved_by?: number | null;
  };
};

export async function createDesignChange(
  jobId: number,
  payload: {
    /** Required by backend: wrong_measurement | dimension_mismatch */
    nc_type: "wrong_measurement" | "dimension_mismatch";
    severity: string;
    title: string;
    description: string;
    qty_affected?: number;
    project_bom_line_id?: number;
    delivery_record_id?: number;
    daily_log_id?: number;
    warehouse_item_id?: number;
    field_installation_unit_id?: number;
    reason?: string;
    measurement_notes?: Record<string, unknown> | string;
    scope_bom_line_ids?: number[];
  },
) {
  return apiRequest<{ data: FieldDesignChangeResult }>(
    `/field-installation/jobs/${jobId}/design-changes`,
    { method: "POST", body: payload },
  );
}

export async function updateNonConformityStatus(
  id: number,
  payload: { status: "acknowledged" | "resolved" | "waived"; resolution_notes?: string },
) {
  return apiRequest<{ data: FieldNonConformity }>(
    `/field-installation/non-conformities/${id}`,
    { method: "PATCH", body: payload },
  );
}

export async function listFieldPhotos(params?: {
  job_id?: number;
}) {
  const search = new URLSearchParams();
  if (params?.job_id) search.set("job_id", String(params.job_id));
  const q = search.toString();

  return apiRequest<{ data: FieldPhoto[] }>(
    `/field-installation/photos${q ? `?${q}` : ""}`,
  );
}

export async function uploadFieldPhoto(payload: {
  job_id: number;
  file: File;
  attachable_type: "daily_log" | "delivery" | "non_conformity" | "unit_progress" | "general";
  attachable_id: number;
  caption?: string;
  taken_at?: string;
}) {
  const formData = new FormData();
  formData.append("job_id", String(payload.job_id));
  formData.append("file", payload.file);
  formData.append("attachable_type", payload.attachable_type);
  formData.append("attachable_id", String(payload.attachable_id));
  if (payload.caption) formData.append("caption", payload.caption);
  if (payload.taken_at) formData.append("taken_at", payload.taken_at);

  return apiRequest<{ data: FieldPhoto }>("/field-installation/photos", {
    method: "POST",
    formData,
  });
}

export async function updateUnit(
  unitId: number,
  payload: { status: string; snag_notes?: string; misfit_notes?: string },
) {
  return apiRequest<{ data: FieldInstallationUnit }>(
    `/field-installation/units/${unitId}`,
    { method: "PATCH", body: payload },
  );
}

export async function listFieldUnits(jobId: number) {
  return apiRequest<{ data: FieldInstallationUnit[] }>(
    `/field-installation/jobs/${jobId}/units`,
  );
}

export async function listToolAssignments(jobId: number) {
  return apiRequest<{ data: FieldToolAssignment[] }>(
    `/field-installation/jobs/${jobId}/tools`,
  );
}

export async function issueTool(
  jobId: number,
  payload: {
    tool_id: number;
    issued_to: number;
    quantity?: number;
    condition_out?: string;
    expected_return_date?: string;
    notes?: string;
  },
) {
  return apiRequest<{ data: FieldToolAssignment }>(
    `/field-installation/jobs/${jobId}/tools/issue`,
    { method: "POST", body: payload },
  );
}

export async function returnTool(
  assignmentId: number,
  payload?: { condition_in?: string; damage_notes?: string },
) {
  return apiRequest<{ data: FieldToolAssignment }>(
    `/field-installation/tool-assignments/${assignmentId}/return`,
    { method: "POST", body: payload ?? {} },
  );
}
