"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  canAccessWorkspaceHub,
  isWorkspaceHubPath,
  resolveHomeRoute,
  resolveAuthRedirect,
} from "@/lib/auth/redirect";
import type { UserStatus } from "@/lib/auth/types";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
  "/recover-email",
  "/access-denied",
  "/change-password",
]);

const ONBOARDING_PATHS = new Set([
  "/onboarding/profile",
  "/onboarding/pending-hr",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

function isOnboardingPath(pathname: string): boolean {
  return ONBOARDING_PATHS.has(pathname);
}

function statusRedirect(
  status: UserStatus,
  departments: ReturnType<typeof useAuth>["departments"],
  serverRedirect?: string | null,
  roles: string[] = []
): string {
  return resolveAuthRedirect(status, departments, serverRedirect, roles);
}

type AuthGuardProps = {
  children: ReactNode;
  mode: "dashboard" | "auth" | "onboarding";
};

export function AuthGuard({ children, mode }: AuthGuardProps) {
  const { user, departments, redirect, roles, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (mode === "dashboard") {
      if (!user) {
        router.replace("/");
        return;
      }

      if (user.status !== "active") {
        router.replace(statusRedirect(user.status, departments, redirect, roles));
        return;
      }

      if (!canAccessWorkspaceHub(roles) && isWorkspaceHubPath(pathname)) {
        router.replace(resolveHomeRoute(departments, roles));
      }
      return;
    }

    if (mode === "auth") {
      if (!user) {
        if (isOnboardingPath(pathname)) {
          router.replace("/");
        }
        return;
      }

      if (isOnboardingPath(pathname)) {
        const expected = statusRedirect(user.status, departments, redirect, roles);
        if (pathname !== expected && user.status !== "active") {
          router.replace(expected);
        }
        return;
      }

      if (isPublicPath(pathname) && pathname !== "/access-denied") {
        if (user.must_change_password && pathname !== "/change-password") {
          router.replace("/change-password");
          return;
        }

        if (user.status === "active") {
          router.replace(statusRedirect(user.status, departments, redirect, roles));
        } else if (
          user.status === "pending_profile_completion" ||
          user.status === "pending_hr_review"
        ) {
          router.replace(statusRedirect(user.status, departments, redirect, roles));
        }
      }
    }
  }, [user, departments, redirect, roles, initialized, mode, pathname, router]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (mode === "dashboard") {
    if (!user || user.status !== "active") {
      return (
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      );
    }
  }

  return <>{children}</>;
}

export { statusRedirect };
