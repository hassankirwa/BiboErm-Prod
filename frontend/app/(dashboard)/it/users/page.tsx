"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, UserPlus } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { InviteEmployeeDialog } from "@/components/hr/invite-employee-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import * as adminApi from "@/lib/api/admin";
import type { AdminUser } from "@/lib/api/admin";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    invited: "bg-blue-100 text-blue-700",
    pending_profile_completion: "bg-amber-100 text-amber-700",
    pending_hr_review: "bg-orange-100 text-orange-700",
    suspended: "bg-red-100 text-red-700",
    inactive: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] ?? "bg-neutral-100"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ItUsersPageContent() {
  const { hasPermission } = useAuth();
  const canInvite = hasPermission("users.invite");
  const canView = hasPermission("users.view");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!canView) return;
    const result = await adminApi.fetchUsers();
    setUsers(result.data);
  }, [canView]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await loadUsers();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.firstError() ?? "Failed to load users."
              : "Failed to load users."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const handleResend = async (userId: number) => {
    setError(null);
    setSuccess(null);
    try {
      const result = await adminApi.resendInvite(userId);
      if (result.mail_sent) {
        setSuccess(result.message);
      } else {
        const devHint = result.dev_mail?.temporary_password
          ? ` Temp password (dev): ${result.dev_mail.temporary_password}`
          : "";
        setError(`${result.mail_warning ?? "Email was not sent."}${devHint}`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to resend invite."
          : "Failed to resend invite."
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Invite users and manage account status.
          </p>
        </div>
        {canInvite && (
          <InviteEmployeeDialog
            title="Invite new user"
            onSuccess={(result) => {
              if (result.mail_sent) {
                setSuccess(result.message);
              } else {
                const devHint = result.dev_mail?.temporary_password
                  ? ` Temp password (dev): ${result.dev_mail.temporary_password}`
                  : "";
                setError(`${result.mail_warning ?? "Email was not sent."}${devHint}`);
              }
              loadUsers();
            }}
            trigger={
              <Button>
                <UserPlus className="size-4" />
                Invite user
              </Button>
            }
          />
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {canView && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const primary = u.department_roles?.find((r) => r.is_primary);
                  const extraCount =
                    (u.department_roles?.length ?? 0) > 1
                      ? (u.department_roles?.length ?? 0) - 1
                      : 0;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{statusBadge(u.status)}</TableCell>
                      <TableCell>
                        {primary?.department?.name ?? "—"}
                        {extraCount > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            +{extraCount} more
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canInvite && u.status === "invited" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(u.id)}
                          >
                            <RefreshCw className="size-3.5" />
                            Resend
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function ItUsersPage() {
  return (
    <PermissionGuard
      permissions={["users.view", "users.invite"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage users.
          </p>
        </div>
      }
    >
      <ItUsersPageContent />
    </PermissionGuard>
  );
}
