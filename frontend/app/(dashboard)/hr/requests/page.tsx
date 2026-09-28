"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Button } from "@/components/ui/button";
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
  approveHrRequest,
  fetchHrRequests,
  rejectHrRequest,
  type HrSelfRequest,
} from "@/lib/api/hr";

function HrRequestsContent() {
  const [items, setItems] = useState<HrSelfRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHrRequests();
      setItems(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load requests."
          : "Unable to load requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: number, action: "approve" | "reject") => {
    setBusyId(id);
    setError(null);
    try {
      if (action === "approve") await approveHrRequest(id);
      else await rejectHrRequest(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to update request."
          : "Unable to update request."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Advanced requests</h1>
        <p className="text-sm text-muted-foreground">
          Review salary advances, documents, letters, and other employee requests.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Staff no.</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.user_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.user_email}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {item.employee_number || "—"}
                </TableCell>
                <TableCell className="capitalize">
                  {item.type.replaceAll("_", " ")}
                </TableCell>
                <TableCell>
                  {item.amount != null ? item.amount.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="max-w-xs text-sm">{item.notes || "—"}</TableCell>
                <TableCell className="capitalize">{item.status}</TableCell>
                <TableCell>
                  {item.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => void review(item.id, "approve")}
                      >
                        <Check className="size-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void review(item.id, "reject")}
                      >
                        <X className="size-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function HrRequestsPage() {
  return (
    <PermissionGuard permissions={["hr_requests.review"]}>
      <HrRequestsContent />
    </PermissionGuard>
  );
}
