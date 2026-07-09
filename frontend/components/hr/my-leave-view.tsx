"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LeaveRequestForm } from "@/components/hr/leave-request-form";
import { LeaveRequestTable } from "@/components/hr/leave-request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { fetchMyLeaveRequests, type LeaveRequest } from "@/lib/api/leave";

/**
 * Self-service leave requests. Rendered inside each department's route
 * namespace (e.g. /finance/leave) so the department sidebar stays active.
 */
export function MyLeaveView() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyLeaveRequests();
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Leave requests</h1>
        <p className="text-sm text-muted-foreground">
          Submit and track your leave requests for HR review.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request leave</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm onSubmitted={load} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your requests</CardTitle>
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
            <LeaveRequestTable requests={requests} mode="self" onChanged={load} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
