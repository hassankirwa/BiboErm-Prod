"use client";

import { usePermissions } from "@/hooks/use-permissions";

export function PermissionGate({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: string;
  anyOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can, canAny } = usePermissions();

  const allowed = permission
    ? can(permission)
    : anyOf
      ? canAny(...anyOf)
      : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
