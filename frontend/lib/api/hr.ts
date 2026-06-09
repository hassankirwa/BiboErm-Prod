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
  employment_type: EmploymentType | null;
  start_date: string | null;
  salary_grade: string | null;
  monthly_gross_salary: number | null;
  reporting_manager_id: number | null;
  work_location: string | null;
  contract_type: ContractType | null;
  contract_end_date: string | null;
  hr_notes: string | null;
};

export type UserProfile = {
  id: number;
  user_id: number;
  phone: string | null;
  avatar_url: string | null;
  gender: string | null;
  address: string | null;
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
  employment_type?: EmploymentType;
  start_date?: string;
  salary_grade?: string;
  monthly_gross_salary?: number;
  reporting_manager_id?: number;
  work_location?: string;
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
