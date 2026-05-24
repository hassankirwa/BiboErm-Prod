"use client";

import { useAuth } from "@/contexts/auth-context";

export function PermissionGuard({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasAnyPermission, initialized } = useAuth();

  if (!initialized) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!hasAnyPermission(...permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
