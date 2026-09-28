"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  fetchMyHrRequests,
  submitMyHrRequest,
  type HrSelfRequest,
  type HrSelfRequestType,
} from "@/lib/api/hr";

const TYPE_OPTIONS: { value: HrSelfRequestType; label: string }[] = [
  { value: "salary_advance", label: "Salary advance" },
  { value: "document", label: "Document request" },
  { value: "letter", label: "Letter / certificate" },
  { value: "other", label: "Other" },
];

export function MyAdvancedRequestsView() {
  const { user } = useAuth();
  const [items, setItems] = useState<HrSelfRequest[]>([]);
  const [isSharedAccount, setIsSharedAccount] = useState(
    Boolean(user?.is_shared_account)
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<HrSelfRequestType>("salary_advance");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyHrRequests();
      setItems(result.data);
      if (typeof result.meta?.is_shared_account === "boolean") {
        setIsSharedAccount(result.meta.is_shared_account);
      }
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

  useEffect(() => {
    if (typeof user?.is_shared_account === "boolean") {
      setIsSharedAccount(user.is_shared_account);
    }
  }, [user?.is_shared_account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitMyHrRequest({
        type,
        amount: amount ? Number(amount) : undefined,
        notes: notes || undefined,
        employee_number: isSharedAccount
          ? employeeNumber.trim() || undefined
          : undefined,
      });
      setAmount("");
      setNotes("");
      setEmployeeNumber("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to submit request."
          : "Unable to submit request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Advanced requests</h1>
        <p className="text-sm text-muted-foreground">
          Request salary advances, documents, letters, and other HR support.
          {isSharedAccount
            ? " Shared accounts must include your employee number. Advance amounts stay private — only status is shown in the list."
            : null}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {isSharedAccount ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employee-number">Employee number *</Label>
                <Input
                  id="employee-number"
                  required
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="e.g. BWD1073"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as HrSelfRequestType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES){type === "salary_advance" ? " *" : ""}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                required={type === "salary_advance"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Submit request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isSharedAccount ? <TableHead>Staff no.</TableHead> : null}
                  <TableHead>Type</TableHead>
                  {!isSharedAccount ? <TableHead>Amount</TableHead> : null}
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const hideAmount =
                    isSharedAccount &&
                    (item.amount_hidden || item.type === "salary_advance");

                  return (
                    <TableRow key={item.id}>
                      {isSharedAccount ? (
                        <TableCell className="font-mono text-sm">
                          {item.employee_number || "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="capitalize">
                        {item.type.replaceAll("_", " ")}
                      </TableCell>
                      {!isSharedAccount ? (
                        <TableCell>
                          {item.amount != null
                            ? item.amount.toLocaleString()
                            : "—"}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <span className="capitalize">{item.status}</span>
                        {hideAmount ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Amount hidden
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
