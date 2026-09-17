"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Save } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmployeeHrForm,
  emptyHrForm,
  hrFormFromEmployee,
  type HrFormState,
} from "@/components/hr/employee-hr-form";
import { EmployeePayComponentsPanel } from "@/components/hr/employee-pay-components-panel";
import { EmployeeIdentityPanel } from "@/components/hr/employee-identity-panel";
import { EmployeePersonalPanel } from "@/components/hr/employee-personal-panel";
import { ProfileChangeRequestReview } from "@/components/hr/profile-change-request-review";
import {
  EmployeeStatusBadge,
  getPrimaryDepartment,
} from "@/components/hr/employee-status-badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";
import type { HrEmployeeDetail, HrEmployeeListItem } from "@/lib/api/hr";

function EmployeeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("employees.update_hr_details");
  const canApprove = hasPermission("employees.approve");
  const canUpdateIdentity = hasPermission("users.update_identity");
  const canInvite = hasPermission("users.invite");
  const canReviewProfileChanges = hasPermission("profile_changes.review");

  const [detail, setDetail] = useState<HrEmployeeDetail | null>(null);
  const [managers, setManagers] = useState<HrEmployeeListItem[]>([]);
  const [form, setForm] = useState<HrFormState>(emptyHrForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!userId || Number.isNaN(userId)) return;
    setLoading(true);
    setError(null);
    try {
      const [employeeDetail, activeList] = await Promise.all([
        hrApi.fetchEmployee(userId),
        hrApi.fetchEmployees({ status: "active", per_page: 100 }),
      ]);
      setDetail(employeeDetail);
      setForm(hrFormFromEmployee(employeeDetail.employee));
      setManagers(activeList.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to load employee."
          : "Failed to load employee."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const buildPayload = () => ({
    employee_number: form.employee_number,
    job_title: form.job_title,
    unit: form.unit || undefined,
    employment_type: form.employment_type,
    start_date: form.start_date,
    reporting_manager_id: form.reporting_manager_id
      ? Number(form.reporting_manager_id)
      : undefined,
    work_location: form.work_location || undefined,
    department_email: form.department_email || undefined,
    national_id: form.national_id || undefined,
    kra_pin: form.kra_pin || undefined,
    nssf_number: form.nssf_number || undefined,
    shif_number: form.shif_number || undefined,
    bank_or_mpesa: form.bank_or_mpesa || undefined,
    salary_grade: form.salary_grade || undefined,
    monthly_gross_salary: form.monthly_gross_salary
      ? Number(form.monthly_gross_salary)
      : undefined,
    contract_type: form.contract_type ? form.contract_type : undefined,
    contract_end_date: form.contract_end_date || undefined,
    hr_notes: form.hr_notes || undefined,
  });

  const handleSave = async () => {
    if (!canUpdate) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await hrApi.upsertEmployeeProfile(userId, buildPayload());
      setSuccess("HR record saved.");
      await loadDetail();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to save HR record."
          : "Failed to save HR record."
      );
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return;
    setApproving(true);
    setError(null);
    setSuccess(null);
    try {
      if (canUpdate) {
        await hrApi.upsertEmployeeProfile(userId, buildPayload());
      }
      await hrApi.approveEmployee(userId);
      setSuccess("Employee approved and activated.");
      await loadDetail();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to approve employee."
          : "Failed to approve employee."
      );
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
        Loading employee...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error ?? "Employee not found."}</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link href="/hr/employees">Back to employees</Link>
        </Button>
      </div>
    );
  }

  const { department, role } = getPrimaryDepartment({
    department_roles: detail.departments.map((d) => ({
      is_primary: d.is_primary,
      department: { name: d.name },
      role: { name: d.role ?? "" },
    })),
  });

  const isPendingHr = detail.user.status === "pending_hr_review";
  const canEditHr =
    canUpdate &&
    (detail.user.status === "pending_hr_review" || detail.user.status === "active");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/hr/employees">
            <ArrowLeft className="size-4" />
            Back to employees
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <UserAvatar
              name={detail.user.name}
              src={detail.profile?.avatar_url}
              className="size-16 shrink-0"
              fallbackClassName="text-base"
            />
            <div>
              <h1 className="text-2xl font-bold">{detail.user.name}</h1>
              <p className="text-sm text-muted-foreground">{detail.user.email}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {department} · {role}
              </p>
            </div>
          </div>
          <EmployeeStatusBadge status={detail.user.status} />
        </div>
      </div>

      {isPendingHr && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This account is pending HR review. Complete the employment record and approve to
          activate.
        </div>
      )}

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <EmployeePersonalPanel
            profile={detail.profile}
            name={detail.user.name}
            pendingChangeRequest={detail.pending_change_request}
          />

          {canReviewProfileChanges &&
            detail.pending_change_request?.status === "pending" && (
              <ProfileChangeRequestReview
                request={detail.pending_change_request}
                onReviewed={loadDetail}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}
        </div>

        <div className="space-y-6">
          {canUpdateIdentity && (
            <EmployeeIdentityPanel
              key={`${detail.user.id}-${detail.user.email}-${detail.user.status}`}
              userId={userId}
              name={detail.user.name}
              email={detail.user.email}
              status={detail.user.status}
              canInvite={canInvite}
              onUpdated={loadDetail}
              onError={setError}
              onSuccess={setSuccess}
            />
          )}

          <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold">Employment record</h3>
          <EmployeeHrForm
            form={form}
            onChange={setForm}
            managers={managers}
            excludeUserId={userId}
            disabled={!canEditHr}
            onGenerateError={setError}
          />

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {canUpdate && detail.user.status === "active" && (
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            )}
            {canUpdate && isPendingHr && (
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Saving..." : "Save draft"}
              </Button>
            )}
            {canApprove && isPendingHr && (
              <Button onClick={handleApprove} disabled={approving || saving}>
                <Check className="size-4" />
                {approving ? "Approving..." : "Approve & activate"}
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>

      {canUpdate && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Payroll earnings &amp; deductions</h2>
          <EmployeePayComponentsPanel userId={userId} disabled={!canEditHr} />
        </div>
      )}

      {detail.user.status === "active" && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => router.push("/hr/employees?status=active")}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HrEmployeeDetailPage() {
  return (
    <PermissionGuard
      permissions={["employees.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view this employee.
          </p>
        </div>
      }
    >
      <EmployeeDetailContent />
    </PermissionGuard>
  );
}
