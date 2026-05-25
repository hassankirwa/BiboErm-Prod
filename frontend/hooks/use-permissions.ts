"use client";

import { useAuth } from "@/contexts/auth-context";
import { useMemo } from "react";

export function usePermissions() {
  const { permissions, hasPermission, hasAnyPermission } = useAuth();

  const can = (permission: string) => {
    if (permissions.includes("*")) return true;
    return hasPermission(permission);
  };

  const canAny = (...perms: string[]) => hasAnyPermission(...perms);

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
