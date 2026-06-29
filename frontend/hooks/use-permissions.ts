"use client";

import { useAuth } from "@/contexts/auth-context";
import { useMemo } from "react";

export function usePermissions() {
  const { permissions, roles, hasPermission, hasAnyPermission } = useAuth();

  const isSuperAdmin = roles.includes("super_admin");

  const can = (permission: string) => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    return hasPermission(permission);
  };

  const canAny = (...perms: string[]) => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    return hasAnyPermission(...perms);
  };

  const canManageUsers = () => can("users.manage") || can("it.manage");
  const canViewUsers = () =>
    canManageUsers() || can("users.view") || can("hr.view");
  const canManageHr = () => can("hr.manage") || canManageUsers();
  const canViewAudit = () => can("audit.view") || can("it.manage");
  const canManageDevices = () => can("devices.manage") || can("it.manage");

  return {
    permissions: useMemo(() => permissions, [permissions]),
    can,
    canAny,
    canManageUsers,
    canViewUsers,
    canManageHr,
    canViewAudit,
    canManageDevices,
  };
}
