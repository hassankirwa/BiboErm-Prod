"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmployeeStatusBadge, getPrimaryDepartment } from "@/components/hr/employee-status-badge";
import { InviteEmployeeDialog } from "@/components/hr/invite-employee-dialog";
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import * as hrApi from "@/lib/api/hr";
import type { HrDashboardStats, HrEmployeeListItem, HrPendingProfileChange } from "@/lib/api/hr";
import { PROFILE_FIELD_LABELS } from "@/lib/profile-fields";
import { cn } from "@/lib/utils";

type EmployeeTab = {
  key: string;
  label: string;
  kind: "status" | "filter";
  countKey?: keyof HrDashboardStats;
};

const TABS: EmployeeTab[] = [
  { key: "", label: "All", kind: "status" },
  { key: "pending_hr_review", label: "Pending HR", kind: "status", countKey: "pending_hr_review" },
  { key: "invited", label: "Invited", kind: "status", countKey: "invited" },
  {
    key: "pending_profile_completion",
    label: "Profile incomplete",
    kind: "status",
    countKey: "pending_profile_completion",
  },
  {
    key: "profile_change_requests",
    label: "Profile reviews",
    kind: "filter",
    countKey: "profile_change_requests_pending",
  },
  { key: "active", label: "Active", kind: "status", countKey: "active" },
];

function formatRequestedFields(fields: string[]): string {
  if (!fields.length) return "Profile update";
  return fields
    .slice(0, 3)
    .map((field) => PROFILE_FIELD_LABELS[field] ?? field)
    .join(", ");
}

function EmployeesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canInvite = hasPermission("users.invite");
  const canCreate = hasPermission("employees.create");

  const filterParam = searchParams.get("filter") ?? "";
  const statusFilter = filterParam ? "" : (searchParams.get("status") ?? "");
  const activeTabKey = filterParam || statusFilter;
  const isProfileReviewsTab = filterParam === "profile_change_requests";

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [pendingChangeByUserId, setPendingChangeByUserId] = useState<
    Record<number, HrPendingProfileChange>
  >({});
  const [stats, setStats] = useState<HrDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    hrApi.fetchHrDashboardStats().then(setStats).catch(() => setStats(null));
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, pendingChanges] = await Promise.all([
        hrApi.fetchEmployees({
          page,
          per_page: 25,
          status: statusFilter || undefined,
          search: search.trim() || undefined,
          has_pending_profile_change: isProfileReviewsTab ? true : undefined,
        }),
        isProfileReviewsTab
          ? hrApi.fetchPendingProfileChanges({ limit: 100 })
          : Promise.resolve({ data: [] as HrPendingProfileChange[] }),
      ]);
      setEmployees(result.data);
      setTotalPages(result.last_page);
      if (isProfileReviewsTab) {
        const byUserId: Record<number, HrPendingProfileChange> = {};
        for (const item of pendingChanges.data) {
          byUserId[item.user_id] = item;
        }
        setPendingChangeByUserId(byUserId);
      } else {
        setPendingChangeByUserId({});
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to load employees."
          : "Failed to load employees."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, isProfileReviewsTab]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, filterParam]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const setEmployeeTab = (tab: EmployeeTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (tab.kind === "filter") {
      params.set("filter", tab.key);
      params.delete("status");
    } else {
      params.delete("filter");
      if (tab.key) params.set("status", tab.key);
      else params.delete("status");
    }
    router.push(`/hr/employees?${params.toString()}`);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  };

  const handleResend = async (userId: number) => {
    setSuccess(null);
    setError(null);
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
      await loadEmployees();
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Invite staff, review onboarding, and manage HR records.
          </p>
        </div>
        {(canInvite || canCreate) && (
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <AddEmployeeDialog
                onSuccess={(result) => {
                  setSuccess(
                    `Employee created (${result.email}). Temp password shown in dialog.`
                  );
                  loadEmployees();
                }}
              />
            )}
            {canInvite && (
              <InviteEmployeeDialog
                onSuccess={(result) => {
                  if (result.mail_sent) {
                    setSuccess(result.message);
                  } else {
                    const devHint = result.dev_mail?.temporary_password
                      ? ` Temp password (dev): ${result.dev_mail.temporary_password}`
                      : "";
                    setError(`${result.mail_warning ?? "Email was not sent."}${devHint}`);
                  }
                  loadEmployees();
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = activeTabKey === tab.key;
          const count =
            tab.countKey && stats ? stats[tab.countKey] : undefined;
          const showCount = typeof count === "number" && count > 0;

          return (
            <button
              key={tab.key || "all"}
              type="button"
              onClick={() => setEmployeeTab(tab)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
                !isActive && showCount && tab.kind === "filter" && "ring-1 ring-violet-300"
              )}
            >
              {tab.label}
              {showCount && (
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isProfileReviewsTab && (
        <p className="text-sm text-muted-foreground">
          Employees who submitted profile updates awaiting HR approval. Open a record to
          approve or reject changes.
        </p>
      )}

      <form onSubmit={handleSearch} className="flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, employee #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Employee #</TableHead>
              <TableHead>Department</TableHead>
              {isProfileReviewsTab && <TableHead>Requested changes</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={isProfileReviewsTab ? 7 : 6}
                  className="text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isProfileReviewsTab ? 7 : 6}
                  className="text-center text-muted-foreground"
                >
                  {isProfileReviewsTab
                    ? "No pending profile change requests."
                    : "No employees found."}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => {
                const { department } = getPrimaryDepartment(emp);
                const pendingChange = pendingChangeByUserId[emp.id];
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.employee_profile?.employee_number ?? "—"}</TableCell>
                    <TableCell>{department}</TableCell>
                    {isProfileReviewsTab && (
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {pendingChange
                          ? formatRequestedFields(pendingChange.fields)
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <EmployeeStatusBadge status={emp.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(isProfileReviewsTab ||
                          emp.status === "pending_hr_review" ||
                          emp.status === "active" ||
                          emp.status === "pending_profile_completion") && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/hr/employees/${emp.id}`}>
                              {isProfileReviewsTab || emp.status === "pending_hr_review"
                                ? "Review"
                                : "View"}
                            </Link>
                          </Button>
                        )}
                        {canInvite && emp.status === "invited" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(emp.id)}
                          >
                            <RefreshCw className="size-3.5" />
                            Resend
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function EmployeesPageFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
      Loading employees...
    </div>
  );
}

export default function HrEmployeesPage() {
  return (
    <PermissionGuard
      permissions={["employees.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view employees.
          </p>
        </div>
      }
    >
      <Suspense fallback={<EmployeesPageFallback />}>
        <EmployeesPageContent />
      </Suspense>
    </PermissionGuard>
  );
}
