"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthDepartment, AuthPayload, AuthUser, LoginResult } from "@/lib/auth/types";
import { isTwoFactorChallenge } from "@/lib/auth/types";
import { resolveAuthRedirect, resolveHomeRoute } from "@/lib/auth/redirect";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type AuthContextValue = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  departments: AuthDepartment[];
  redirect: string | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthPayload | null>;
  setFromPayload: (payload: AuthPayload) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  homeRoute: string;
  resolveRedirect: (serverRedirect?: string | null) => string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyPayload(payload: AuthPayload) {
  return {
    user: {
      ...payload.user,
      avatar_url: payload.user.avatar_url ?? null,
      two_factor_enabled: payload.user.two_factor_enabled ?? false,
    },
    roles: payload.roles,
    permissions: payload.permissions,
    departments: payload.departments,
    redirect: payload.redirect,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<AuthDepartment[]>([]);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const setFromPayload = useCallback((payload: AuthPayload) => {
    const next = applyPayload(payload);
    setUser(next.user);
    setRoles(next.roles);
    setPermissions(next.permissions);
    setDepartments(next.departments);
    setRedirect(next.redirect);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setDepartments([]);
    setRedirect(null);
  }, []);

  const refreshMe = useCallback(async (): Promise<AuthPayload | null> => {
    try {
      const payload = await authApi.fetchMe();
      setFromPayload(payload);
      return payload;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearAuth();
      }
      return null;
    }
  }, [clearAuth, setFromPayload]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await authApi.fetchMe();
        if (!cancelled) {
          setFromPayload(payload);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, setFromPayload]);

  const login = useCallback(
    async (email: string, password: string, remember = false): Promise<LoginResult> => {
      setLoading(true);
      try {
        const result = await authApi.login(email, password, remember);
        if (!isTwoFactorChallenge(result)) {
          setFromPayload(result);
        }
        return result;
      } finally {
        setLoading(false);
      }
    },
    [setFromPayload]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Session may already be expired
    } finally {
      clearAuth();
      setLoading(false);
    }
  }, [clearAuth]);

  const hasPermission = useCallback(
    (permission: string) =>
      roles.includes("super_admin") ||
      permissions.includes("*") ||
      permissions.includes(permission),
    [permissions, roles],
  );

  const hasAnyPermission = useCallback(
    (...perms: string[]) =>
      roles.includes("super_admin") ||
      permissions.includes("*") ||
      perms.some((p) => permissions.includes(p)),
    [permissions, roles],
  );

  const homeRoute = useMemo(
    () => resolveHomeRoute(departments, roles),
    [departments, roles]
  );

  const resolveRedirect = useCallback(
    (serverRedirect?: string | null) => {
      if (!user) return "/";
      return resolveAuthRedirect(user.status, departments, serverRedirect ?? redirect, roles);
    },
    [user, departments, redirect, roles]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles,
      permissions,
      departments,
      redirect,
      loading,
      initialized,
      login,
      logout,
      refreshMe,
      setFromPayload,
      hasPermission,
      hasAnyPermission,
      homeRoute,
      resolveRedirect,
    }),
    [
      user,
      roles,
      permissions,
      departments,
      redirect,
      loading,
      initialized,
      login,
      logout,
      refreshMe,
      setFromPayload,
      hasPermission,
      hasAnyPermission,
      homeRoute,
      resolveRedirect,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
