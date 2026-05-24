import { apiRequest } from "./client";
import { ensureCsrfCookie } from "./csrf";

export type Gender = "male" | "female" | "other";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export type UserProfile = {
  id: number;
  user_id: number;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  gender: Gender | null;
  avatar_url: string | null;
  avatar_path: string | null;
};

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  gender?: Gender;
};

export type ProfileSettings = {
  user: {
    id: number;
    name: string;
    email: string;
    two_factor_enabled: boolean;
    status?: string;
  };
  profile: UserProfile;
  employee_number: string | null;
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

export async function fetchProfile(): Promise<ProfileSettings> {
  return apiRequest("/profile");
}

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<{ message: string; profile: UserProfile }> {
  await ensureCsrfCookie();
  return apiRequest("/profile", { method: "PUT", body: payload });
}

export async function submitProfileChangeRequest(
  payload: UpdateProfilePayload & { user_note?: string }
): Promise<{ message: string; change_request: ProfileChangeRequest }> {
  await ensureCsrfCookie();
  return apiRequest("/profile/change-requests", { method: "POST", body: payload });
}

export async function uploadAvatar(file: File): Promise<{
  message: string;
  avatar_path: string;
  avatar_url: string | null;
  profile: UserProfile;
}> {
  await ensureCsrfCookie();
  const formData = new FormData();
  formData.append("avatar", file);
  return apiRequest("/profile/avatar", { method: "POST", formData });
}

export async function enableTwoFactor(password: string): Promise<{
  message: string;
  two_factor_enabled: boolean;
}> {
  await ensureCsrfCookie();
  return apiRequest("/profile/two-factor/enable", {
    method: "POST",
    body: { password },
  });
}

export async function disableTwoFactor(password: string): Promise<{
  message: string;
  two_factor_enabled: boolean;
}> {
  await ensureCsrfCookie();
  return apiRequest("/profile/two-factor/disable", {
    method: "POST",
    body: { password },
  });
}
