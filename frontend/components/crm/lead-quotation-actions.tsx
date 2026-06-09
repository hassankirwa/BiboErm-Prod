"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Banknote,
  ExternalLink,
  FileText,
  FolderKanban,
  Loader2,
  Send,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  createProjectFromDeal,
  markDealWon,
  recordPayment,
} from "@/lib/api/crm/deals";
import { quotationAmount, sendQuotation } from "@/lib/api/crm/quotations";
import type { ApiDeal, ApiQuotationSummary } from "@/lib/api/crm/types";
import { projectDetailPath } from "@/lib/projects/paths";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUOTATION_STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  internal_review: "bg-warning/10 text-warning border-warning/20",
  sent: "bg-primary/10 text-primary border-primary/20",
  revision_requested: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  revised: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  accepted: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-muted text-muted-foreground",
};

const SENT_QUOTATION_STATUSES = new Set([
  "sent",
  "revision_requested",
  "revised",
  "accepted",
]);

const SENDABLE_QUOTATION_STATUSES = new Set(["draft", "internal_review", "revised"]);

function quotationViewHref(
  quotation: ApiQuotationSummary,
  sent: boolean,
): string {
  if (sent) {
    return `/crm/quotations/${quotation.id}/preview`;
  }
  return `/crm/quotations/${quotation.id}`;
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return `KES ${num.toLocaleString("en-KE")}`;
}

function formatQuotationStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dealIsWon(deal: ApiDeal | null | undefined): boolean {
  if (!deal) return false;
  return deal.status === "won" || deal.stage === "won" || deal.stage === "project_created";
}

function depositMet(deal: ApiDeal | null | undefined): boolean {
  if (!deal) return false;
  if (deal.payment_status === "deposit_met") return true;
  const required = parseFloat(String(deal.deposit_required_amount ?? 0)) || 0;
  const paid = parseFloat(String(deal.deposit_paid_amount ?? deal.deposit_amount ?? 0)) || 0;
  return required > 0 && paid >= required;
}

type LeadQuotationActionsProps = {
  latestQuotation: ApiQuotationSummary | null | undefined;
  salesDeal: ApiDeal | null | undefined;
  linkedAccountId: number | null;
  showCreateQuotation: boolean;
  disabled?: boolean;
  onRefresh: () => Promise<void>;
};

export function LeadQuotationActions({
  latestQuotation,
  salesDeal,
  linkedAccountId,
  showCreateQuotation,
  disabled = false,
  onRefresh,
}: LeadQuotationActionsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_reference: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount_paid: "",
    payment_method: "mpesa",
    notes: "",
  });

  const dealId = salesDeal?.id ?? latestQuotation?.deal_id ?? null;
  const projectId = salesDeal?.project_id ?? latestQuotation?.project_id ?? null;
  const quotationSent =
    latestQuotation?.status != null &&
    SENT_QUOTATION_STATUSES.has(latestQuotation.status);
  const won = dealIsWon(salesDeal);
  const hasDeposit = depositMet(salesDeal);

  async function runAction(key: string, fn: () => Promise<void>) {
    setActionLoading(key);
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRecordPayment() {
    if (!dealId) {
      toast.error("No deal linked to this quotation yet.");
      return;
    }

    const amount = parseFloat(paymentForm.amount_paid);
    if (!paymentForm.payment_reference.trim() || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment reference and amount.");
      return;
    }

    await runAction("deposit", async () => {
      await recordPayment(dealId, {
        payment_reference: paymentForm.payment_reference.trim(),
        payment_date: paymentForm.payment_date,
        amount_paid: amount,
        payment_method: paymentForm.payment_method,
        payment_status: "confirmed",
        quotation_id: latestQuotation?.id,
        notes: paymentForm.notes.trim() || undefined,
      });
      setPaymentDialogOpen(false);
      setPaymentForm((f) => ({ ...f, payment_reference: "", amount_paid: "", notes: "" }));
      toast.success("Deposit recorded.");
    });
  }

  async function handleMarkWon() {
    if (!dealId) return;
    await runAction("won", async () => {
      await markDealWon(dealId);
      toast.success("Deal marked as won.");
    });
  }

  async function handleCreateProject() {
    if (!dealId) return;
    await runAction("project", async () => {
      const result = await createProjectFromDeal(dealId);
      const project = result.data.project;
      toast.success(`Project ${project.name ?? `#${project.id}`} created.`);
    });
  }

  async function handleSendQuotation() {
    if (!latestQuotation?.id) return;
    await runAction("send", async () => {
      await sendQuotation(latestQuotation.id);
      toast.success("Quotation sent to client.");
    });
  }

  const canSendQuotation =
    latestQuotation?.status != null &&
    SENDABLE_QUOTATION_STATUSES.has(latestQuotation.status);

  if (!latestQuotation && !showCreateQuotation) {
    return null;
  }

  return (
    <>
      {latestQuotation ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-background px-3 py-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {latestQuotation.quotation_number ?? `Quotation #${latestQuotation.id}`}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-6 border px-2 text-[11px] font-medium",
              QUOTATION_STATUS_STYLES[latestQuotation.status ?? ""] ??
                "bg-muted text-muted-foreground",
            )}
          >
            {formatQuotationStatus(latestQuotation.status)}
          </Badge>
          {latestQuotation.revision_label ? (
            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-normal">
              {latestQuotation.revision_label}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatCurrency(quotationAmount(latestQuotation as Parameters<typeof quotationAmount>[0]))}
          </span>
          <Button size="sm" variant="outline" className="ml-auto h-7 px-2 text-xs" asChild>
            <Link href={quotationViewHref(latestQuotation, quotationSent)}>
              {quotationSent ? "Preview" : "View"}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      ) : null}

      {showCreateQuotation && linkedAccountId && !latestQuotation ? (
        <PermissionGate permission="projects.bom.upload">
          <Button size="sm" className="h-9" asChild>
            <Link href={`/projects/quotations/new?accountId=${linkedAccountId}`}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Project Quotation
            </Link>
          </Button>
        </PermissionGate>
      ) : null}

      {latestQuotation && quotationSent && dealId ? (
        <>
          {!hasDeposit ? (
            <PermissionGate permission="deal_payments.record">
              <Button
                size="sm"
                className="h-9"
                disabled={disabled || actionLoading != null}
                onClick={() => setPaymentDialogOpen(true)}
              >
                {actionLoading === "deposit" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Banknote className="mr-1.5 h-3.5 w-3.5" />
                )}
                Record Deposit
              </Button>
            </PermissionGate>
          ) : null}

          {!won ? (
            <PermissionGate permission="deals.mark_won">
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                disabled={disabled || actionLoading != null}
                onClick={handleMarkWon}
              >
                {actionLoading === "won" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trophy className="mr-1.5 h-3.5 w-3.5" />
                )}
                Mark Won
              </Button>
            </PermissionGate>
          ) : null}

          {won && !projectId ? (
            <PermissionGate permission="deals.create_project">
              <Button
                size="sm"
                className="h-9"
                disabled={disabled || actionLoading != null}
                onClick={handleCreateProject}
              >
                {actionLoading === "project" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                )}
                Create Project
              </Button>
            </PermissionGate>
          ) : null}

          {projectId ? (
            <Button size="sm" variant="outline" className="h-9" asChild>
              <Link href={projectDetailPath(projectId, "crm")}>
                <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                View Project
              </Link>
            </Button>
          ) : null}

          <Button size="sm" variant="outline" className="h-9" asChild>
            <Link href={`/crm/deals/${dealId}`}>View Deal</Link>
          </Button>
        </>
      ) : null}

      {latestQuotation && canSendQuotation ? (
        <PermissionGate permission="quotations.send">
          <Button
            size="sm"
            className="h-9"
            disabled={disabled || actionLoading != null}
            onClick={handleSendQuotation}
          >
            {actionLoading === "send" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Send to Client
          </Button>
        </PermissionGate>
      ) : null}

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record deposit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-payment-ref">Payment reference</Label>
              <Input
                id="lead-payment-ref"
                value={paymentForm.payment_reference}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, payment_reference: e.target.value }))
                }
                placeholder="e.g. MPESA-ABC123"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-payment-date">Payment date</Label>
              <Input
                id="lead-payment-date"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-payment-amount">Amount (KES)</Label>
              <Input
                id="lead-payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount_paid}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, amount_paid: e.target.value }))
                }
                placeholder={
                  salesDeal?.deposit_required_amount
                    ? String(salesDeal.deposit_required_amount)
                    : "250000"
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) =>
                  setPaymentForm((f) => ({ ...f, payment_method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-payment-notes">Notes (optional)</Label>
              <Textarea
                id="lead-payment-notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={actionLoading === "deposit"}
            >
              {actionLoading === "deposit" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
