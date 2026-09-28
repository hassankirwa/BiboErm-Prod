"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  LEAVE_TYPE_OPTIONS,
  submitLeaveRequest,
  type LeaveType,
} from "@/lib/api/leave";

type LeaveRequestFormProps = {
  onSubmitted?: () => void;
  remainingDays?: number | null;
  availableDays?: number | null;
};

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  if (endDate < startDate) return null;
  const ms = endDate.getTime() - startDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function LeaveRequestForm({
  onSubmitted,
  remainingDays = null,
  availableDays = null,
}: LeaveRequestFormProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedDays = useMemo(
    () => daysBetween(startDate, endDate),
    [startDate, endDate]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitLeaveRequest({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      onSubmitted?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to submit leave request."
          : "Unable to submit leave request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(remainingDays != null || availableDays != null) && (
        <p className="text-sm text-muted-foreground">
          Annual leave remaining:{" "}
          <span className="font-medium text-foreground">{remainingDays ?? "—"}</span>
          {availableDays != null && availableDays !== remainingDays
            ? ` (${availableDays} available after pending requests)`
            : null}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="leave_type">Leave type</Label>
          <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
            <SelectTrigger id="leave_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start date</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End date</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
      {requestedDays != null && (
        <p className="text-sm text-muted-foreground">
          This request: <span className="font-medium text-foreground">{requestedDays}</span> day
          {requestedDays === 1 ? "" : "s"}
          {leaveType === "annual" &&
          availableDays != null &&
          requestedDays > availableDays
            ? " — exceeds available annual leave"
            : null}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Brief reason for your leave request"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        Submit request
      </Button>
    </form>
  );
}
