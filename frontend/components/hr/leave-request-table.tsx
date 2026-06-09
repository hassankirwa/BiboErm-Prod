"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LeaveStatusBadge } from "@/components/hr/leave-status-badge";
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
  LEAVE_TYPE_OPTIONS,
  approveLeaveRequest,
  cancelLeaveRequest,
  rejectLeaveRequest,
  type LeaveRequest,
} from "@/lib/api/leave";

function leaveTypeLabel(value: string): string {
  return LEAVE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

type LeaveRequestTableProps = {
  requests: LeaveRequest[];
  mode: "self" | "hr";
  onChanged?: () => void;
};

export function LeaveRequestTable({
  requests,
  mode,
  onChanged,
}: LeaveRequestTableProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(id: number, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Action failed."
          : "Action failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!requests.length) {
    return (
      <p className="text-sm text-muted-foreground">No leave requests found.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            {mode === "hr" && <TableHead>Employee</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              {mode === "hr" && (
                <TableCell>
                  <div>
                    <p className="font-medium">{request.user_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.user_email}
                    </p>
                  </div>
                </TableCell>
              )}
              <TableCell>{leaveTypeLabel(request.leave_type)}</TableCell>
              <TableCell>
                {formatDate(request.start_date)} – {formatDate(request.end_date)}
              </TableCell>
              <TableCell>
                <LeaveStatusBadge status={request.status} />
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {request.reason ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {mode === "self" && request.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === request.id}
                    onClick={() =>
                      runAction(request.id, () => cancelLeaveRequest(request.id))
                    }
                  >
                    {busyId === request.id && (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    )}
                    Cancel
                  </Button>
                )}
                {mode === "hr" && request.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === request.id}
                      onClick={() =>
                        runAction(request.id, () => approveLeaveRequest(request.id))
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === request.id}
                      onClick={() =>
                        runAction(request.id, () => rejectLeaveRequest(request.id))
                      }
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
