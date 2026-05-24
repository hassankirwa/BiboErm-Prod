export type UserStatus =
  | "invited"
  | "pending_profile_completion"
  | "pending_hr_review"
  | "active"
  | "suspended"
  | "inactive";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  status: UserStatus;
  email_verified_at: string | null;
  onboarding_completed_at: string | null;
  must_change_password: boolean;
  two_factor_enabled: boolean;
  avatar_url: string | null;
};

export type TwoFactorChallenge = {
  two_factor_required: true;
  challenge_token: string;
  email_hint: string;
  expires_in: number;
  mail_sent: boolean;
  mail_warning?: string | null;
};

export type LoginResult = AuthPayload | TwoFactorChallenge;

export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallenge {
  return "two_factor_required" in result && result.two_factor_required === true;
}

export type AuthDepartment = {
  id: number;
  name: string;
  slug: string;
  default_module?: string | null;
  is_primary: boolean;
  role_id: number;
};

export type AuthPayload = {
  user: AuthUser;
  roles: string[];
  permissions: string[];
  departments: AuthDepartment[];
  redirect: string;
};

export type AuthState = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  departments: AuthDepartment[];
  redirect: string | null;
  loading: boolean;
  initialized: boolean;
};

export type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};
