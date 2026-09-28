import { apiRequest } from "./client";
import { ensureCsrfCookie } from "./csrf";

export type EmploymentType = "full_time" | "part_time" | "contract";

export type ContractType =
  | "permanent"
  | "fixed_term"
  | "probation"
  | "intern"
  | "consultant";

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
];

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "permanent", label: "Permanent" },
  { value: "fixed_term", label: "Fixed term" },
  { value: "probation", label: "Probation" },
  { value: "intern", label: "Intern" },
  { value: "consultant", label: "Consultant" },
];

export type EmployeeProfile = {
  id: number;
  user_id: number;
  employee_number: string | null;
  job_title: string | null;
  unit: string | null;
  employment_type: EmploymentType | null;
  start_date: string | null;
  salary_grade: string | null;
  monthly_gross_salary: number | null;
  reporting_manager_id: number | null;
  work_location: string | null;
  department_email: string | null;
  national_id: string | null;
  kra_pin: string | null;
  nssf_number: string | null;
  shif_number: string | null;
  bank_or_mpesa: string | null;
  contract_type: ContractType | null;
  contract_end_date: string | null;
  hr_notes: string | null;
};

export type UserProfile = {
  id: number;
  user_id: number;
  phone: string | null;
  phone_alt: string | null;
  avatar_url: string | null;
  gender: string | null;
  address: string | null;
  home_county: string | null;
  home_area: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

export type HrDepartmentAssignment = {
  id: number;
  name: string;
  slug: string;
  is_primary: boolean;
  role_id: number;
  role: string | null;
};

export type HrEmployeeListItem = {
  id: number;
  name: string;
  email: string;
  status: string;
  last_login_at: string | null;
  profile?: UserProfile | null;
  employee_profile?: EmployeeProfile | null;
  department_roles?: Array<{
    id: number;
    is_primary: boolean;
    department?: { id: number; name: string; slug: string } | null;
    role?: { id: number; name: string } | null;
  }>;
};

export type PaginatedEmployees = {
  data: HrEmployeeListItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type HrEmployeeDetail = {
  user: {
    id: number;
    name: string;
    email: string;
    status: string;
    email_verified_at: string | null;
    onboarding_completed_at: string | null;
    last_login_at: string | null;
  };
  profile: UserProfile | null;
  employee: EmployeeProfile | null;
  departments: HrDepartmentAssignment[];
  reporting_manager: { id: number; name: string; email: string } | null;
  pending_change_request: ProfileChangeRequest | null;
};

export type ProfileChangeRequest = {
  id: number;
  status: "pending" | "approved" | "rejected";
  requested_changes: Record<string, string | null>;
  previous_values: Record<string, string | null> | null;
  user_note: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
};

export type HrUpsertPayload = {
  employee_number?: string;
  job_title?: string;
  unit?: string;
  employment_type?: EmploymentType;
  start_date?: string;
  salary_grade?: string;
  monthly_gross_salary?: number;
  reporting_manager_id?: number;
  work_location?: string;
  department_email?: string;
  national_id?: string;
  kra_pin?: string;
  nssf_number?: string;
  shif_number?: string;
  bank_or_mpesa?: string;
  contract_type?: ContractType;
  contract_end_date?: string;
  hr_notes?: string;
};

export type FetchEmployeesParams = {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  department_id?: number;
  has_pending_profile_change?: boolean;
};

export type HrDashboardStats = {
  total_employees: number;
  active: number;
  pending_hr_review: number;
  pending_profile_completion: number;
  invited: number;
  suspended: number;
  inactive: number;
  profile_change_requests_pending: number;
  leave_requests_pending: number;
  total_documents: number;
};

export type HrPendingProfileChange = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  created_at: string | null;
  fields: string[];
};

export async function fetchHrDashboardStats(): Promise<HrDashboardStats> {
  return apiRequest("/hr/dashboard/stats");
}

export async function fetchPendingProfileChanges(params?: {
  limit?: number;
}): Promise<{
  data: HrPendingProfileChange[];
}> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiRequest(
    `/hr/dashboard/pending-profile-changes${query ? `?${query}` : ""}`
  );
}

export async function fetchEmployees(
  params: FetchEmployeesParams = {}
): Promise<PaginatedEmployees> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.department_id) qs.set("department_id", String(params.department_id));
  if (params.has_pending_profile_change) qs.set("has_pending_profile_change", "1");
  const query = qs.toString();
  return apiRequest(`/hr/employees${query ? `?${query}` : ""}`);
}

export async function fetchSuggestedEmployeeNumber(
  excludeUserId?: number
): Promise<{ employee_number: string }> {
  const qs = excludeUserId
    ? `?exclude_user_id=${encodeURIComponent(String(excludeUserId))}`
    : "";
  return apiRequest(`/hr/employees/suggested-number${qs}`);
}

export async function fetchEmployee(userId: number): Promise<HrEmployeeDetail> {
  return apiRequest(`/hr/employees/${userId}`);
}

export async function upsertEmployeeProfile(
  userId: number,
  payload: HrUpsertPayload
): Promise<{ message: string; employee: EmployeeProfile }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function approveEmployee(
  userId: number
): Promise<{ message: string; user: { id: number; status: string } }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/approve`, { method: "POST" });
}

export async function updateEmployeeIdentity(
  userId: number,
  payload: { email: string; name?: string }
): Promise<{ message: string; user: { id: number; name: string; email: string } }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/identity`, {
    method: "PATCH",
    body: payload,
  });
}

export async function resetEmployeePassword(
  userId: number
): Promise<{ message: string; temporary_password: string; must_change_password: boolean }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/reset-password`, { method: "POST" });
}

export async function approveProfileChangeRequest(
  requestId: number
): Promise<{ message: string; change_request: ProfileChangeRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/profile-change-requests/${requestId}/approve`, {
    method: "POST",
  });
}

export async function rejectProfileChangeRequest(
  requestId: number,
  reason?: string
): Promise<{ message: string; change_request: ProfileChangeRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/profile-change-requests/${requestId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export type PayComponentKind = "addition" | "deduction";
export type PayComponentCategory =
  | "bonus"
  | "overtime"
  | "house_allowance"
  | "transport_allowance"
  | "other_allowance"
  | "damage"
  | "lost_tool"
  | "custom"
  | "salary_advance";

export type EmployeePayComponent = {
  id: number;
  user_id: number;
  kind: PayComponentKind;
  category: string;
  label: string | null;
  amount: number;
  is_recurring: boolean;
  effective_from: string | null;
  effective_to: string | null;
  reference: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string | null;
};

export type PayComponentPayload = {
  kind: PayComponentKind;
  category: string;
  label?: string;
  amount: number;
  is_recurring?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  reference?: string | null;
  notes?: string | null;
};

export async function fetchPayComponents(
  userId: number
): Promise<{ data: EmployeePayComponent[] }> {
  return apiRequest(`/hr/employees/${userId}/pay-components`);
}

export async function createPayComponent(
  userId: number,
  payload: PayComponentPayload
): Promise<{ message: string; data: EmployeePayComponent }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/pay-components`, {
    method: "POST",
    body: payload,
  });
}

export async function updatePayComponent(
  userId: number,
  componentId: number,
  payload: Partial<PayComponentPayload>
): Promise<{ message: string; data: EmployeePayComponent }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/pay-components/${componentId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deletePayComponent(
  userId: number,
  componentId: number
): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/pay-components/${componentId}`, {
    method: "DELETE",
  });
}

export type DirectCreateEmployeePayload = {
  name: string;
  email?: string;
  activate_now?: boolean;
  department_id: number;
  role_id: number;
  additional_assignments?: Array<{ department_id: number; role_id: number }>;
  employee_number?: string;
  job_title?: string;
  unit?: string;
  employment_type?: EmploymentType;
  start_date?: string;
  work_location?: string;
  department_email?: string;
  phone?: string;
  phone_alt?: string;
  address?: string;
  home_county?: string;
  home_area?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  national_id?: string;
  kra_pin?: string;
  nssf_number?: string;
  shif_number?: string;
  bank_or_mpesa?: string;
  monthly_gross_salary?: number;
  reporting_manager_id?: number;
  hr_notes?: string;
};

export async function createEmployee(
  payload: DirectCreateEmployeePayload
): Promise<{
  message: string;
  data: { user: { id: number; name: string; email: string; status: string }; temporary_password: string };
}> {
  await ensureCsrfCookie();
  return apiRequest("/hr/employees", { method: "POST", body: payload });
}

export type DepartmentSharedEmail = {
  id: number;
  name: string;
  slug: string;
  shared_email: string | null;
  is_active: boolean;
};

export async function fetchDepartmentSettings(): Promise<{
  data: DepartmentSharedEmail[];
}> {
  return apiRequest("/hr/department-settings");
}

export async function updateDepartmentSettings(payload: {
  departments: Array<{ id: number; shared_email?: string | null }>;
}): Promise<{ data: DepartmentSharedEmail[] }> {
  await ensureCsrfCookie();
  return apiRequest("/hr/department-settings", { method: "PUT", body: payload });
}

export async function sendEmployeeInvite(
  userId: number,
  payload?: { email?: string }
): Promise<{
  message: string;
  user_id: number;
  mail_sent: boolean;
  mail_warning?: string;
  dev_mail?: {
    email?: string;
    temporary_password?: string;
    accept_url?: string;
    login_url?: string;
  };
}> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/${userId}/send-invite`, {
    method: "POST",
    body: payload ?? {},
  });
}

export type PayrollSettings = {
  id: number;
  nssf_tier1_cap: number;
  nssf_tier2_cap: number;
  nssf_rate: number;
  personal_relief: number;
  annual_leave_days: number;
  paye_bands: Array<{ min: number; max: number; rate: number }>;
};

export type PayrollDeductionType = {
  id: number;
  code: string;
  name: string;
  method: string;
  rate: number | null;
  amount: number | null;
  tax_deductible: boolean;
  enabled: boolean;
  is_system: boolean;
  sort_order: number;
};

export async function fetchPayrollSettings(): Promise<{
  data: { settings: PayrollSettings; deduction_types: PayrollDeductionType[] };
}> {
  return apiRequest("/hr/payroll-settings");
}

export async function updatePayrollSettings(
  payload: Partial<PayrollSettings>
): Promise<{
  data: { settings: PayrollSettings; deduction_types: PayrollDeductionType[] };
}> {
  await ensureCsrfCookie();
  return apiRequest("/hr/payroll-settings", { method: "PUT", body: payload });
}

export async function createDeductionType(payload: {
  name: string;
  code?: string;
  method: "percent_of_gross" | "fixed";
  rate?: number;
  amount?: number;
  tax_deductible?: boolean;
  enabled?: boolean;
}): Promise<{ message: string; data: PayrollDeductionType }> {
  await ensureCsrfCookie();
  return apiRequest("/hr/payroll-settings/deduction-types", {
    method: "POST",
    body: payload,
  });
}

export async function updateDeductionType(
  id: number,
  payload: Partial<{
    name: string;
    rate: number | null;
    amount: number | null;
    tax_deductible: boolean;
    enabled: boolean;
    sort_order: number;
  }>
): Promise<{ message: string; data: PayrollDeductionType }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-settings/deduction-types/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteDeductionType(
  id: number
): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-settings/deduction-types/${id}`, {
    method: "DELETE",
  });
}

export type HrSelfRequestType =
  | "salary_advance"
  | "document"
  | "letter"
  | "other";

export type HrSelfRequest = {
  id: number;
  type: HrSelfRequestType;
  amount: number | null;
  amount_hidden?: boolean;
  employee_number?: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  reviewer_name?: string | null;
};

export async function fetchMyHrRequests(): Promise<{
  data: HrSelfRequest[];
  meta?: { is_shared_account?: boolean };
}> {
  return apiRequest("/my/hr-requests");
}

export async function submitMyHrRequest(payload: {
  type: HrSelfRequestType;
  amount?: number;
  notes?: string;
  employee_number?: string;
}): Promise<{
  message: string;
  data: HrSelfRequest;
  meta?: { is_shared_account?: boolean };
}> {
  await ensureCsrfCookie();
  return apiRequest("/my/hr-requests", { method: "POST", body: payload });
}

export async function fetchHrRequests(params?: {
  status?: string;
}): Promise<{ data: HrSelfRequest[] }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest(`/hr/requests${query ? `?${query}` : ""}`);
}

export async function approveHrRequest(
  id: number,
  payload?: { review_notes?: string; recover_from?: string }
): Promise<{ message: string; data: HrSelfRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/requests/${id}/approve`, {
    method: "POST",
    body: payload ?? {},
  });
}

export async function rejectHrRequest(
  id: number,
  payload?: { review_notes?: string }
): Promise<{ message: string; data: HrSelfRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/requests/${id}/reject`, {
    method: "POST",
    body: payload ?? {},
  });
}

export type HrSuggestion = {
  id: number;
  is_anonymous: boolean;
  employee_number?: string | null;
  body: string;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  reviewer_name?: string | null;
};

export async function submitMySuggestion(payload: {
  body: string;
  is_anonymous?: boolean;
  employee_number?: string;
}): Promise<{
  message: string;
  data: HrSuggestion;
  meta?: { is_shared_account?: boolean };
}> {
  await ensureCsrfCookie();
  return apiRequest("/my/hr-suggestions", { method: "POST", body: payload });
}

export async function fetchHrSuggestions(params?: {
  status?: string;
}): Promise<{ data: HrSuggestion[] }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest(`/hr/suggestions${query ? `?${query}` : ""}`);
}

export async function updateHrSuggestion(
  id: number,
  payload: { status: string; review_notes?: string }
): Promise<{ message: string; data: HrSuggestion }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/suggestions/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export type StaffImportPreviewRow = {
  employee_number?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  unit?: string | null;
  job_title?: string | null;
  start_date?: string | null;
  phone?: string | null;
  phone_alt?: string | null;
  home_county?: string | null;
  home_area?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  national_id?: string | null;
  kra_pin?: string | null;
  nssf_number?: string | null;
  shif_number?: string | null;
  bank_or_mpesa?: string | null;
  hr_notes?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  _sync_status?: "new" | "changed" | "unchanged";
  _changed_fields?: string[];
  _warnings?: string[];
  [key: string]: unknown;
};

export async function extractStaffImport(file: File): Promise<{
  data: {
    rows: StaffImportPreviewRow[];
    summary: {
      total: number;
      new: number;
      changed: number;
      unchanged: number;
      with_photos: number;
      warnings: number;
    };
    extract_token: string;
    source_filename: string | null;
  };
  meta: { extract_token: string };
}> {
  await ensureCsrfCookie();
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/hr/employees/import/extract", {
    method: "POST",
    formData,
  });
}

export async function importStaffRows(payload: {
  rows: StaffImportPreviewRow[];
  extract_token?: string | null;
}): Promise<{
  message: string;
  data: { created: number; updated: number; skipped: number; errors: string[] };
}> {
  await ensureCsrfCookie();
  return apiRequest("/hr/employees/import", { method: "POST", body: payload });
}

export async function discardStaffImportExtract(
  token: string
): Promise<{ data: { discarded: boolean } }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/employees/import/extract/${token}`, {
    method: "DELETE",
  });
}
