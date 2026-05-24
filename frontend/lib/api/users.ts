import { apiFetch } from "./client";
import type { ApiDepartment, ApiRole, ApiUser } from "./auth";

export type ApiEmployeeProfile = {
  id?: number;
  user_id?: number;
  employee_number: string | null;
  national_id?: string | null;
  kra_pin?: string | null;
  nhif_number?: string | null;
  nssf_number?: string | null;
  contract_type: string | null;
  contract_start: string | null;
  contract_end: string | null;
  residence: string | null;
  emergency_contacts: Array<{
    name: string;
    phone: string;
    relationship?: string;
  }> | null;
  salary?: string | null;
  has_bank_details?: boolean | null;
  hr_notes?: string | null;
};

export type ApiUserDetail = ApiUser & {
  date_joined?: string | null;
  department_id?: number | null;
  employee_profile?: ApiEmployeeProfile | null;
  devices?: Array<{
    id: number;
    name: string;
    uuid: string;
    status: string;
    is_primary: boolean;
  }>;
  created_by?: { id: number; name: string } | null;
};

type PaginatedUsers = {
  data: ApiUserDetail[];
  meta?: { current_page: number; last_page: number; total: number };
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  department_id?: number | null;
  job_title?: string;
  status?: string;
  date_joined?: string;
  role_ids?: number[];
  must_reset_password?: boolean;
  employee_profile?: Partial<ApiEmployeeProfile>;
};

export async function fetchUsers(params?: {
  search?: string;
  status?: string;
  department_id?: number;
  role?: string;
  page?: number;
}): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.department_id) qs.set("department_id", String(params.department_id));
  if (params?.role) qs.set("role", params.role);
  if (params?.page) qs.set("page", String(params.page));
  const query = qs.toString();
  return apiFetch<PaginatedUsers>(`/api/v1/users${query ? `?${query}` : ""}`);
}

export async function fetchUser(id: number): Promise<ApiUserDetail> {
  return apiFetch<ApiUserDetail>(`/api/v1/users/${id}`);
}

export async function createUser(payload: CreateUserPayload): Promise<ApiUserDetail> {
  return apiFetch<ApiUserDetail>("/api/v1/users", {
    method: "POST",
    json: payload,
  });
}

export async function updateUser(
  id: number,
  payload: Partial<CreateUserPayload>,
): Promise<ApiUserDetail> {
  return apiFetch<ApiUserDetail>(`/api/v1/users/${id}`, {
    method: "PUT",
    json: payload,
  });
}

export async function suspendUser(id: number): Promise<ApiUserDetail> {
  return apiFetch<ApiUserDetail>(`/api/v1/users/${id}/suspend`, { method: "POST" });
}

export async function activateUser(id: number): Promise<ApiUserDetail> {
  return apiFetch<ApiUserDetail>(`/api/v1/users/${id}/activate`, { method: "POST" });
}

export async function resetUserPassword(
  id: number,
  options?: { password?: string; return_password?: boolean },
): Promise<{ message: string; temporary_password?: string }> {
  return apiFetch(`/api/v1/users/${id}/reset-password`, {
    method: "POST",
    json: {
      password: options?.password,
      return_password: options?.return_password ?? true,
    },
  });
}

export async function syncUserRoles(
  id: number,
  roleIds: number[],
): Promise<ApiUserDetail> {
  return apiFetch<ApiUserDetail>(`/api/v1/users/${id}/roles`, {
    method: "PUT",
    json: { role_ids: roleIds },
  });
}

export async function fetchEmployeeProfile(userId: number): Promise<ApiEmployeeProfile> {
  return apiFetch<ApiEmployeeProfile>(`/api/v1/users/${userId}/employee-profile`);
}

export async function updateEmployeeProfile(
  userId: number,
  payload: Partial<ApiEmployeeProfile> & { bank_details?: string },
): Promise<ApiEmployeeProfile> {
  return apiFetch<ApiEmployeeProfile>(`/api/v1/users/${userId}/employee-profile`, {
    method: "PUT",
    json: payload,
  });
}

export async function fetchDepartments(): Promise<{ data: ApiDepartment[] }> {
  const res = await apiFetch<{ data: ApiDepartment[] }>("/api/v1/departments");
  return { data: res.data ?? [] };
}

export type ApiRoleDetail = ApiRole & {
  description?: string | null;
  permissions: string[];
  requires_2fa?: boolean;
  is_active?: boolean;
  users_count?: number;
};

export async function fetchRoles(): Promise<{ data: ApiRoleDetail[] }> {
  const res = await apiFetch<{ data: ApiRoleDetail[] }>("/api/v1/roles");
  return { data: res.data ?? [] };
}

export async function updateRole(
  id: number,
  payload: { permissions?: string[]; requires_2fa?: boolean; description?: string },
): Promise<ApiRoleDetail> {
  return apiFetch<ApiRoleDetail>(`/api/v1/roles/${id}`, {
    method: "PUT",
    json: payload,
  });
}
