"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useMemo } from "react";

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(
    () => user?.permissions ?? [],
    [user?.permissions],
  );

  const can = (permission: string) => {
    if (!user) return false;
    if (permissions.includes("*")) return true;
    return permissions.includes(permission);
  };

  const canAny = (...perms: string[]) => perms.some((p) => can(p));

  const canManageUsers = () => can("users.manage") || can("it.manage");
  const canViewUsers = () =>
    canManageUsers() || can("users.view") || can("hr.view");
  const canManageHr = () => can("hr.manage") || canManageUsers();
  const canViewAudit = () => can("audit.view") || can("it.manage");
  const canManageDevices = () => can("devices.manage") || can("it.manage");

  return {
    permissions,
    can,
    canAny,
    canManageUsers,
    canViewUsers,
    canManageHr,
    canViewAudit,
    canManageDevices,
  };
}
