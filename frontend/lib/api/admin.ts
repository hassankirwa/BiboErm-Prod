import { apiRequest } from "./client";
import { ensureCsrfCookie } from "./csrf";

export type Department = {
  id: number;
  name: string;
  slug: string;
};

export type Role = {
  id: number;
  name: string;
  slug: string;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  profile?: {
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
  employee_profile?: {
    employee_number?: string | null;
    job_title?: string | null;
  } | null;
  department_roles?: Array<{
    id: number;
    is_primary: boolean;
    department?: Department | null;
    role?: Role | null;
  }>;
};

export type PaginatedUsers = {
  data: AdminUser[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export async function fetchUsers(page = 1): Promise<PaginatedUsers> {
  return apiRequest(`/admin/users?page=${page}&per_page=25`);
}

export type InviteUserResponse = {
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
};

export async function inviteUser(payload: {
  email: string;
  name?: string;
  department_id: number;
  role_id: number;
  additional_assignments?: Array<{ department_id: number; role_id: number }>;
}): Promise<InviteUserResponse> {
  await ensureCsrfCookie();
  return apiRequest("/admin/users/invite", {
    method: "POST",
    body: payload,
  });
}

export async function resendInvite(userId: number): Promise<InviteUserResponse> {
  await ensureCsrfCookie();
  return apiRequest(`/admin/users/${userId}/resend-invite`, { method: "POST" });
}

export async function updateUserStatus(
  userId: number,
  status: string
): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function fetchDepartments(): Promise<Department[]> {
  return apiRequest("/admin/lookups/departments");
}

export async function fetchRoles(departmentId?: number): Promise<Role[]> {
  const query = departmentId ? `?department_id=${departmentId}` : "";
  return apiRequest(`/admin/lookups/roles${query}`);
}
