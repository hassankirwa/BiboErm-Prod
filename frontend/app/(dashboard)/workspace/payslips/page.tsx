"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
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
import { ApiError } from "@/lib/api/client";
import {
  downloadMyPayslip,
  fetchMyPayslips,
  type PayrollEntry,
} from "@/lib/api/payroll";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function WorkspacePayslipsPage() {
  const [payslips, setPayslips] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyPayslips();
      setPayslips(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load payslips."
          : "Unable to load payslips."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDownload(entry: PayrollEntry) {
    setBusyId(entry.id);
    try {
      const result = await downloadMyPayslip(entry.id);
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Download failed."
          : "Download failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Payslips</h1>
        <p className="text-sm text-muted-foreground">
          View and download your approved payslips.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payslip history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !payslips.length ? (
            <p className="text-sm text-muted-foreground">No payslips available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Net pay</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.period_label ?? "—"}</TableCell>
                    <TableCell>{formatMoney(entry.gross_salary)}</TableCell>
                    <TableCell>{formatMoney(entry.net_pay)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === entry.id}
                        onClick={() => handleDownload(entry)}
                      >
                        {busyId === entry.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
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
