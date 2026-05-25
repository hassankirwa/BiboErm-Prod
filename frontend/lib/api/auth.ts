import type { AuthPayload, LoginResult } from "@/lib/auth/types";
import { apiRequest } from "./client";
import { ensureCsrfCookie } from "./csrf";

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

export async function login(
  email: string,
  password: string,
  remember = false,
): Promise<LoginResult> {
  await ensureCsrfCookie();
  return apiRequest<LoginResult>("/auth/login", {
    method: "POST",
    body: { email, password, remember },
  });
}

export async function verifyTwoFactor(payload: {
  challenge_token: string;
  code: string;
}): Promise<AuthPayload> {
  await ensureCsrfCookie();
  return apiRequest<AuthPayload>("/auth/two-factor/verify", {
    method: "POST",
    body: payload,
  });
}

export async function resendTwoFactor(challenge_token: string): Promise<{
  message: string;
  challenge_token: string;
  email_hint: string;
  expires_in: number;
  mail_sent: boolean;
  mail_warning?: string | null;
}> {
  await ensureCsrfCookie();
  return apiRequest("/auth/two-factor/resend", {
    method: "POST",
    body: { challenge_token },
  });
}

export async function logout(): Promise<void> {
  await ensureCsrfCookie();
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function fetchMe(): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/me");
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  const payload = await fetchMe();
  return mapAuthPayload(payload);
}

export async function acceptInvite(
  token: string,
  password: string,
  password_confirmation: string,
): Promise<AuthPayload> {
  await ensureCsrfCookie();
  return apiRequest<AuthPayload>("/auth/accept-invite", {
    method: "POST",
    body: { token, password, password_confirmation },
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(payload: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export async function recoverEmail(
  employee_number: string,
): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest<{ message: string }>("/auth/recover-email", {
    method: "POST",
    body: { employee_number },
  });
}

export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: payload,
  });
}

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
