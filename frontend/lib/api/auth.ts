import type { AuthPayload, LoginResult } from "@/lib/auth/types";
import { apiRequest } from "./client";
import { ensureCsrfCookie } from "./csrf";

export async function login(
  email: string,
  password: string,
  remember = false
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

export async function acceptInvite(
  token: string,
  password: string,
  password_confirmation: string
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
  employee_number: string
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
