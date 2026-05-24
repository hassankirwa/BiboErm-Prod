"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmployeeStatusBadge, getPrimaryDepartment } from "@/components/hr/employee-status-badge";
import { InviteEmployeeDialog } from "@/components/hr/invite-employee-dialog";
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
import type { HrEmployeeListItem } from "@/lib/api/hr";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "", label: "All" },
  { key: "pending_hr_review", label: "Pending HR" },
  { key: "invited", label: "Invited" },
  { key: "pending_profile_completion", label: "Profile pending" },
  { key: "active", label: "Active" },
] as const;

function EmployeesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canInvite = hasPermission("users.invite");

  const statusFilter = searchParams.get("status") ?? "";
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await hrApi.fetchEmployees({
        page,
        per_page: 25,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setEmployees(result.data);
      setTotalPages(result.last_page);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to load employees."
          : "Failed to load employees."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const setStatusTab = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    params.delete("page");
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

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key || "all"}
            type="button"
            onClick={() => setStatusTab(tab.key)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              statusFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => {
                const { department } = getPrimaryDepartment(emp);
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.employee_profile?.employee_number ?? "—"}</TableCell>
                    <TableCell>{department}</TableCell>
                    <TableCell>
                      <EmployeeStatusBadge status={emp.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(emp.status === "pending_hr_review" ||
                          emp.status === "active" ||
                          emp.status === "pending_profile_completion") && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/hr/employees/${emp.id}`}>
                              {emp.status === "pending_hr_review" ? "Review" : "View"}
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
