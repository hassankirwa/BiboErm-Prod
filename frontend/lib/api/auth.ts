import { apiFetch, ensureCsrfCookie } from "./client";

export type ApiRole = {
  id: number;
  slug: string;
  name: string;
};

export type ApiDepartment = {
  id: number;
  slug: string;
  name: string;
  default_module?: string | null;
  is_primary?: boolean;
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  status: string;
  profile_photo_path?: string | null;
  department?: ApiDepartment | null;
  roles?: ApiRole[];
  permissions?: string[];
  last_login_at?: string | null;
  must_reset_password?: boolean;
  must_change_password?: boolean;
  onboarding_completed_at?: string | null;
};

type AuthPayload = {
  user: {
    id: number;
    name: string;
    email: string;
    status: string;
    email_verified_at?: string | null;
    onboarding_completed_at?: string | null;
    must_change_password?: boolean;
  };
  roles: string[];
  permissions: string[];
  departments: Array<{
    id: number;
    name: string;
    slug: string;
    is_primary: boolean;
    role_id: number;
  }>;
  redirect?: string;
};

function mapAuthPayload(payload: AuthPayload): ApiUser {
  const primaryDept =
    payload.departments.find((d) => d.is_primary) ?? payload.departments[0];

  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
    status: payload.user.status,
    must_reset_password: payload.user.must_change_password ?? false,
    must_change_password: payload.user.must_change_password ?? false,
    onboarding_completed_at: payload.user.onboarding_completed_at ?? null,
    permissions: payload.permissions,
    roles: payload.roles.map((slug, index) => ({
      id: index + 1,
      slug,
      name: slug.replace(/_/g, " "),
    })),
    department: primaryDept
      ? {
          id: primaryDept.id,
          slug: primaryDept.slug,
          name: primaryDept.name,
          is_primary: primaryDept.is_primary,
        }
      : null,
  };
}

export async function login(
  email: string,
  password: string,
  remember = false,
): Promise<ApiUser> {
  await ensureCsrfCookie();

  const data = await apiFetch<AuthPayload>("/api/v1/auth/login", {
    method: "POST",
    json: { email, password, remember },
  });

  return mapAuthPayload(data);
}

export async function logout(): Promise<void> {
  await apiFetch("/api/v1/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  const res = await apiFetch<AuthPayload>("/api/v1/auth/me");
  return mapAuthPayload(res);
}

export function getUserInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getPrimaryRoleLabel(user: ApiUser): string {
  return user.roles?.[0]?.name ?? user.job_title ?? "User";
}
