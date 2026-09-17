"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PayrollEntryDetailSheet } from "@/components/hr/payroll-entry-detail-sheet";
import { PayrollStatusBadge } from "@/components/hr/payroll-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  approvePayrollRun,
  fetchPayrollRun,
  generatePayrollRun,
  rejectPayrollRun,
  submitPayrollRun,
  type PayrollEntry,
  type PayrollRun,
} from "@/lib/api/payroll";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

function deductionSummary(entry: PayrollEntry): string {
  const parts = [
    entry.shif ? `SHIF ${formatMoney(entry.shif)}` : null,
    entry.nssf ? `NSSF ${formatMoney(entry.nssf)}` : null,
    entry.paye ? `PAYE ${formatMoney(entry.paye)}` : null,
    entry.other_deductions
      ? `Other ${formatMoney(entry.other_deductions)}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function PayrollRunDetailContent() {
  const params = useParams();
  const runId = Number(params.id);
  const { permissions } = useAuth();
  const canManage = permissions.includes("payroll.manage");
  const canApprove = permissions.includes("payroll.approve");

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPayrollRun(runId);
      setRun(result.data);
      setSelectedEntry((current) => {
        if (!current) return null;
        return result.data.entries?.find((entry) => entry.id === current.id) ?? null;
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load payroll run."
          : "Unable to load payroll run."
      );
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Action failed."
          : "Action failed."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading payroll run…
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error ?? "Payroll run not found."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/hr/payroll">
              <ArrowLeft className="mr-1 size-4" />
              Back to payroll
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Payroll {run.period_label}
            </h1>
            <PayrollStatusBadge status={run.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Open an employee to review deductions and configure overtime, bonuses, or extra
            deductions for this period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && run.status === "draft" && (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => runAction(() => generatePayrollRun(run.id))}
              >
                Generate entries
              </Button>
              <Button
                disabled={busy || !run.entries?.length}
                onClick={() => runAction(() => submitPayrollRun(run.id))}
              >
                Submit to finance
              </Button>
            </>
          )}
          {canApprove && run.status === "pending_finance" && (
            <>
              <Button
                disabled={busy}
                onClick={() => runAction(() => approvePayrollRun(run.id))}
              >
                Approve payroll
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => runAction(() => rejectPayrollRun(run.id))}
              >
                Return to draft
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total gross
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatMoney(run.total_gross ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total net pay
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatMoney(run.total_net ?? 0)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee entries</CardTitle>
        </CardHeader>
        <CardContent>
          {!run.entries?.length ? (
            <p className="text-sm text-muted-foreground">
              No entries yet. Generate from active employees with gross salary set.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Additions</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.employee_number ?? entry.user_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatMoney(entry.gross_salary)}</TableCell>
                    <TableCell>
                      {(entry.additions_total ?? 0) > 0
                        ? formatMoney(entry.additions_total ?? 0)
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {deductionSummary(entry)}
                    </TableCell>
                    <TableCell>{formatMoney(entry.net_pay)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PayrollEntryDetailSheet
        open={selectedEntry != null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
        runId={run.id}
        periodYear={run.period_year}
        periodMonth={run.period_month}
        entry={selectedEntry}
        canEdit={canManage && run.status === "draft"}
        onUpdated={() => void load()}
      />
    </div>
  );
}

export default function PayrollRunDetailPage() {
  return (
    <PermissionGuard
      permissions={["payroll.manage", "payroll.view", "payroll.approve"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view payroll.
          </p>
        </div>
      }
    >
      <PayrollRunDetailContent />
    </PermissionGuard>
  );
}
