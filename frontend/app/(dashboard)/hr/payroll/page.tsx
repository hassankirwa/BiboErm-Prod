"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PayrollStatusBadge } from "@/components/hr/payroll-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { createPayrollRun, fetchPayrollRuns, type PayrollRun } from "@/lib/api/payroll";

function HrPayrollListContent() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPayrollRuns({ per_page: 50 });
      setRuns(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load payroll runs."
          : "Unable to load payroll runs."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const result = await createPayrollRun({
        period_year: Number(year),
        period_month: Number(month),
      });
      setDialogOpen(false);
      window.location.href = `/hr/payroll/${result.data.id}`;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to create payroll run."
          : "Unable to create payroll run."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Create monthly payroll runs and submit for finance approval.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              New payroll run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create payroll run</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="period_year">Year</Label>
                  <Input
                    id="period_year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_month">Month</Label>
                  <Input
                    id="period_month"
                    type="number"
                    min={1}
                    max={12}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !runs.length ? (
            <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.period_label}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell>{run.entries_count ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/hr/payroll/${run.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HrPayrollPage() {
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
      <HrPayrollListContent />
    </PermissionGuard>
  );
}
