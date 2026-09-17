"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { EmployeePayComponentsPanel } from "@/components/hr/employee-pay-components-panel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import {
  recalculatePayrollEntry,
  type PayrollEntry,
} from "@/lib/api/payroll";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

type PayrollEntryDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: number;
  periodYear: number;
  periodMonth: number;
  entry: PayrollEntry | null;
  canEdit: boolean;
  onUpdated: () => void;
};

export function PayrollEntryDetailSheet({
  open,
  onOpenChange,
  runId,
  periodYear,
  periodMonth,
  entry,
  canEdit,
  onUpdated,
}: PayrollEntryDetailSheetProps) {
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) return null;

  const additions = (entry.line_items ?? []).filter((line) => line.kind === "addition");
  const deductions = (entry.line_items ?? []).filter((line) => line.kind === "deduction");
  const configuredNote =
    additions.length === 0 && deductions.length === 0
      ? "No configured additions or deductions applied for this period yet."
      : null;

  async function recalculate() {
    setRecalculating(true);
    setError(null);
    try {
      await recalculatePayrollEntry(runId, entry!.id);
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to recalculate entry."
          : "Unable to recalculate entry."
      );
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{entry.user_name ?? "Employee payroll"}</SheetTitle>
          <SheetDescription>
            {entry.employee_number ?? entry.user_email ?? "Payroll entry detail"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Gross</p>
              <p className="text-lg font-semibold">{formatMoney(entry.gross_salary)}</p>
              {(entry.additions_total ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Includes {formatMoney(entry.additions_total ?? 0)} additions
                </p>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Net pay</p>
              <p className="text-lg font-semibold">{formatMoney(entry.net_pay)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">SHIF</p>
              <p className="font-medium">{formatMoney(entry.shif ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">NSSF</p>
              <p className="font-medium">{formatMoney(entry.nssf)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">PAYE</p>
              <p className="font-medium">{formatMoney(entry.paye)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Other deductions</p>
              <p className="font-medium">{formatMoney(entry.other_deductions)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Payslip lines</h3>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={recalculating}
                  onClick={() => void recalculate()}
                >
                  {recalculating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Recalculate
                </Button>
              )}
            </div>
            {configuredNote ? (
              <p className="text-sm text-muted-foreground">{configuredNote}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additions.map((line, index) => (
                    <TableRow key={`add-${line.code}-${index}`}>
                      <TableCell>{line.name}</TableCell>
                      <TableCell className="capitalize text-emerald-700">Addition</TableCell>
                      <TableCell className="text-right">{formatMoney(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {deductions.map((line, index) => (
                    <TableRow key={`ded-${line.code}-${index}`}>
                      <TableCell>{line.name}</TableCell>
                      <TableCell className="capitalize text-amber-700">Deduction</TableCell>
                      <TableCell className="text-right">-{formatMoney(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Configure additions &amp; deductions</h3>
              <p className="text-xs text-muted-foreground">
                Add overtime, bonuses, allowances, damage, or other lines for this employee.
                {canEdit
                  ? " Changes apply on recalculate for this draft payroll period."
                  : " Open this run in draft to edit."}
              </p>
            </div>
            <EmployeePayComponentsPanel
              userId={entry.user_id}
              disabled={!canEdit}
              periodYear={periodYear}
              periodMonth={periodMonth}
              onChanged={() => {
                if (canEdit) void recalculate();
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
