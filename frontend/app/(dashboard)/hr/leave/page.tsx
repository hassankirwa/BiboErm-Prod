"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { LeaveRequestTable } from "@/components/hr/leave-request-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { fetchHrLeaveRequests, type LeaveRequest } from "@/lib/api/leave";

function HrLeaveContent() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHrLeaveRequests({
        status: statusFilter || undefined,
        per_page: 50,
      });
      setRequests(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load leave requests."
          : "Unable to load leave requests."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Leave management</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve employee leave requests.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
          { key: "", label: "All" },
        ].map((tab) => (
          <Button
            key={tab.key || "all"}
            variant={statusFilter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <LeaveRequestTable requests={requests} mode="hr" onChanged={load} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HrLeavePage() {
  return (
    <PermissionGuard
      permissions={["leave.review"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to review leave requests.
          </p>
        </div>
      }
    >
      <HrLeaveContent />
    </PermissionGuard>
  );
}
