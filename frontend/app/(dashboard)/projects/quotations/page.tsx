"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveQuotation, sendQuotation } from "@/lib/api/crm/quotations";
import type { ApiQuotation } from "@/lib/api/crm/types";
import { ApiError } from "@/lib/api/errors";
import {
  fetchPendingQuotationAccounts,
  fetchWorkspaceQuotations,
  formatKes,
  type PendingQuotationAccount,
} from "@/lib/api/projects/quotations";
import {
  APPROVABLE_QUOTATION_STATUSES,
  formatQuotationStatus,
  QUOTATION_APPROVE_PERMISSIONS,
  QUOTATION_STATUS_BADGE_CLASS,
  QUOTATION_RELEASE_PERMISSIONS,
  SENDABLE_QUOTATION_STATUSES,
} from "@/lib/quotations/status";
import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink, FileSpreadsheet, Loader2, Plus, Ruler, Send } from "lucide-react";
import { toast } from "sonner";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "internal_review", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "revised", label: "Revised" },
  { value: "accepted", label: "Accepted" },
] as const;

function quotationLabel(quotation: ApiQuotation): string {
  return (
    quotation.project_name ??
    quotation.quotation_number ??
    quotation.project_number ??
    `Quotation #${quotation.id}`
  );
}

function accountLabel(quotation: ApiQuotation): string {
  const account = quotation.account as { name?: string; account_number?: string } | undefined;
  return account?.name ?? "—";
}

export default function ProjectQuotationsPage() {
  const [pending, setPending] = useState<PendingQuotationAccount[]>([]);
  const [quotations, setQuotations] = useState<ApiQuotation[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingQuotations, setLoadingQuotations] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const loadQuotations = useCallback(async () => {
    setLoadingQuotations(true);
    try {
      const response = await fetchWorkspaceQuotations({
        status: statusFilter || undefined,
        per_page: 50,
      });
      setQuotations(response.data ?? []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load quotations.");
      setQuotations([]);
    } finally {
      setLoadingQuotations(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void (async () => {
      setLoadingPending(true);
      try {
        setPending(await fetchPendingQuotationAccounts());
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load pending accounts.");
      } finally {
        setLoadingPending(false);
      }
    })();
  }, []);

  useEffect(() => {
    void loadQuotations();
  }, [loadQuotations]);

  async function handleApprove(quotation: ApiQuotation) {
    setApprovingId(quotation.id);
    try {
      await approveQuotation(quotation.id);
      toast.success(`${quotationLabel(quotation)} approved.`);
      await loadQuotations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve quotation.");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleSendToClient(quotation: ApiQuotation) {
    setSendingId(quotation.id);
    try {
      await sendQuotation(quotation.id);
      toast.success(`${quotationLabel(quotation)} sent to client.`);
      await loadQuotations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send quotation.");
    } finally {
      setSendingId(null);
    }
  }

  const pendingApprovalCount = quotations.filter(
    (q) => q.status === "internal_review",
  ).length;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Quotation"
        subtitle="Create quotations, review pending approvals, and release to sales"
        actions={
          <Button asChild>
            <Link href="/projects/quotations/new">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" />
                Generated quotations
              </CardTitle>
              {!statusFilter && pendingApprovalCount > 0 ? (
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                  {pendingApprovalCount} pending approval
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value || "all"}
                  type="button"
                  size="sm"
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loadingQuotations ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : quotations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {statusFilter
                  ? `No quotations with status “${formatQuotationStatus(statusFilter)}”.`
                  : "No quotations yet. Create one from an approved site visit below."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => {
                    const canApprove =
                      quotation.status != null &&
                      APPROVABLE_QUOTATION_STATUSES.has(quotation.status);
                    const canSend =
                      quotation.status != null &&
                      SENDABLE_QUOTATION_STATUSES.has(quotation.status);

                    return (
                      <TableRow key={quotation.id}>
                        <TableCell>
                          <div className="font-medium">{quotationLabel(quotation)}</div>
                          <div className="text-xs text-muted-foreground">
                            {quotation.quotation_number ?? quotation.project_number ?? `#${quotation.id}`}
                            {quotation.revision_label ? ` · ${quotation.revision_label}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{accountLabel(quotation)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              QUOTATION_STATUS_BADGE_CLASS[quotation.status ?? ""] ??
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {formatQuotationStatus(quotation.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatKes(quotation.total_amount)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {quotation.updated_at
                            ? new Date(quotation.updated_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/projects/quotations/${quotation.id}`}>
                                View
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            {canApprove ? (
                              <PermissionGate anyOf={[...QUOTATION_APPROVE_PERMISSIONS]}>
                                <Button
                                  size="sm"
                                  disabled={approvingId === quotation.id}
                                  onClick={() => void handleApprove(quotation)}
                                >
                                  {approvingId === quotation.id ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </Button>
                              </PermissionGate>
                            ) : null}
                            {canSend ? (
                              <PermissionGate anyOf={[...QUOTATION_RELEASE_PERMISSIONS]}>
                                <Button
                                  size="sm"
                                  disabled={sendingId === quotation.id}
                                  onClick={() => void handleSendToClient(quotation)}
                                >
                                  {sendingId === quotation.id ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Send to client
                                </Button>
                              </PermissionGate>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4" />
              Pending — Measurements Done, No Quotation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No accounts are waiting for a quotation. Approved site visits will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Approved Visit</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.account_number ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>{account.primary_contact?.name ?? "—"}</TableCell>
                      <TableCell>
                        {account.latest_approved_visit?.visit_number ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {account.has_accounting_document ? (
                            <Badge variant="secondary">Accounting</Badge>
                          ) : null}
                          {account.has_design_document ? (
                            <Badge variant="secondary">Design</Badge>
                          ) : null}
                          {!account.has_accounting_document && !account.has_design_document ? (
                            <Badge variant="outline">Awaiting upload</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link href={`/projects/quotations/new?accountId=${account.id}`}>
                            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                            Create Quote
                          </Link>
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
    </div>
  );
}
