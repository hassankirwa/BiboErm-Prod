"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordPayment } from "@/lib/api/crm/deals";
import { approveQuotation, sendQuotation, submitQuotationForReview } from "@/lib/api/crm/quotations";
import type { ApiQuotation, ApiQuotationLine } from "@/lib/api/crm/types";
import { ApiError } from "@/lib/api/errors";
import {
  appendWorkspaceQuotationNegotiationNote,
  fetchWorkspaceQuotation,
  formatKes,
  formatUsd,
  reviseWorkspaceQuotation,
} from "@/lib/api/projects/quotations";
import {
  lineKesTotal,
  lineUsdTotal,
  quotationHasUsdLines,
} from "@/lib/currency/quotation-pricing";
import { buildQuotationExchangeRate } from "@/lib/currency/usd-to-kes";
import { useUsdToKesRate } from "@/lib/currency/use-usd-to-kes-rate";
import { projectDetailPath } from "@/lib/projects/paths";
import {
  quotationDetailPath,
  quotationListPath,
  quotationPreviewPath,
  type QuotationViewMode,
} from "@/lib/quotations/paths";
import {
  APPROVABLE_QUOTATION_STATUSES,
  formatQuotationStatus,
  QUOTATION_APPROVE_PERMISSIONS,
  QUOTATION_RELEASE_PERMISSIONS,
  quotationStatusDescription,
  SENDABLE_QUOTATION_STATUSES,
  SUBMITTABLE_QUOTATION_STATUSES,
} from "@/lib/quotations/status";
import { hasRecordedDeposit } from "@/lib/crm-lead-status";
import { cn } from "@/lib/utils";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Eye,
  ExternalLink,
  GitBranch,
  History,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const SENT_STATUSES = new Set(["sent", "revision_requested", "revised", "accepted"]);

function num(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPreviousReferenceCopy(
  current: ApiQuotation,
  history: ApiQuotation[] = [],
): ApiQuotation | null {
  if (current.is_reference_copy) return null;

  const currentRev = current.revision_number ?? 1;
  if (currentRev <= 1) return null;

  const refs = history.filter((q) => q.is_reference_copy);
  const immediate = refs.find((q) => (q.revision_number ?? 1) === currentRev - 1);
  if (immediate) return immediate;

  return (
    refs
      .filter((q) => (q.revision_number ?? 1) < currentRev)
      .sort((a, b) => (b.revision_number ?? 1) - (a.revision_number ?? 1))[0] ?? null
  );
}

function computePricingSummary(quotation: ApiQuotation, rate: number | null) {
  const lines = quotation.lines ?? [];
  const hasUsd = quotationHasUsdLines(lines);
  const subtotalKes = lines.reduce(
    (sum, line) => sum + lineKesTotal(line, hasUsd ? rate : null),
    0,
  );
  const subtotalUsd = lines.reduce((sum, line) => sum + lineUsdTotal(line), 0);
  const taxRate = num(quotation.tax_rate) || 16;
  const discount = num(quotation.discount_amount);
  const tax = subtotalKes * (taxRate / 100);
  const grandTotal = subtotalKes - discount + tax;

  return { subtotalKes, subtotalUsd, tax, grandTotal, taxRate, hasUsd };
}

function quotationPanelLabel(quotation: ApiQuotation, role: "reference" | "current"): string {
  const label = quotation.revision_label ?? `v${quotation.revision_number ?? 1}`;
  if (role === "reference") {
    return `Reference copy · ${label}`;
  }
  if (quotation.status === "draft") {
    return `Current draft · ${label}`;
  }
  return `Current quotation · ${label}`;
}

function QuotationLinesPanel({
  quotation,
  role,
  rate,
}: {
  quotation: ApiQuotation;
  role: "reference" | "current";
  rate: number | null;
}) {
  const summary = useMemo(() => computePricingSummary(quotation, rate), [quotation, rate]);
  const lines = quotation.lines ?? [];

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{quotationPanelLabel(quotation, role)}</CardTitle>
          <Badge variant="outline">{quotation.status ?? "draft"}</Badge>
          {quotation.is_reference_copy ? (
            <Badge variant="secondary">Reference</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {lines.length} line items · {formatKes(summary.grandTotal)}
          {quotation.sent_at
            ? ` · Sent ${new Date(quotation.sent_at).toLocaleDateString()}`
            : ""}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Series</th>
              <th className="py-2 pr-4">Glass</th>
              <th className="py-2 pr-4">Dimensions</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 pr-4 text-right">
                {summary.hasUsd ? "Total (KES)" : "Total"}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No line items.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <QuotationLineRow key={line.id} line={line} rate={summary.hasUsd ? rate : null} />
              ))
            )}
          </tbody>
        </table>
        {lines.length > 0 ? (
          <div className="mt-4 space-y-1 border-t pt-3 text-sm">
            {summary.hasUsd ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (USD)</span>
                <span>{formatUsd(summary.subtotalUsd)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Subtotal{summary.hasUsd ? " (KES)" : ""}
              </span>
              <span>{formatKes(summary.subtotalKes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({summary.taxRate}%)</span>
              <span>{formatKes(summary.tax)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Grand Total (KES)</span>
              <span>{formatKes(summary.grandTotal)}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuotationLineRow({
  line,
  rate,
}: {
  line: ApiQuotationLine;
  rate: number | null;
}) {
  return (
    <tr className="border-b">
      <td className="py-2 pr-4 font-medium">{line.code ?? "—"}</td>
      <td className="py-2 pr-4">{line.series ?? "—"}</td>
      <td className="py-2 pr-4">{line.glass_type ?? line.description}</td>
      <td className="py-2 pr-4">
        {line.width_mm && line.height_mm ? `${line.width_mm} × ${line.height_mm} mm` : "—"}
      </td>
      <td className="py-2 pr-4">{line.quantity}</td>
      <td className="py-2 pr-4 text-right">{formatKes(lineKesTotal(line, rate))}</td>
    </tr>
  );
}

type QuotationDetailViewProps = {
  quotationId: number;
  mode: QuotationViewMode;
};

export function QuotationDetailView({ quotationId, mode }: QuotationDetailViewProps) {
  const router = useRouter();
  const isCrmMode = mode === "crm";
  const [quotation, setQuotation] = useState<ApiQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [revising, setRevising] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [recordingDeposit, setRecordingDeposit] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_reference: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount_paid: "",
    payment_method: "mpesa",
    notes: "",
  });
  const {
    rateInfo,
    effectiveRate,
    loading: loadingRate,
    error: rateError,
    manualOverride,
    setManualOverride,
    isManual,
    refresh: refreshRate,
  } = useUsdToKesRate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuotation(
        await fetchWorkspaceQuotation(quotationId, { includeHistory: !isCrmMode }),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load quotation.");
    } finally {
      setLoading(false);
    }
  }, [isCrmMode, quotationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const referenceQuotation = useMemo(
    () => (quotation ? getPreviousReferenceCopy(quotation, quotation.revision_history) : null),
    [quotation],
  );

  const hasUsdLines = useMemo(() => {
    const currentLines = quotation?.lines ?? [];
    const referenceLines = referenceQuotation?.lines ?? [];
    return quotationHasUsdLines(currentLines) || quotationHasUsdLines(referenceLines);
  }, [quotation, referenceQuotation]);

  const exchangeRate = useMemo(() => {
    if (!hasUsdLines) return null;
    return buildQuotationExchangeRate(rateInfo, effectiveRate, isManual);
  }, [effectiveRate, hasUsdLines, isManual, rateInfo]);

  const currentSummary = useMemo(
    () => (quotation ? computePricingSummary(quotation, effectiveRate) : null),
    [effectiveRate, quotation],
  );

  const backHref = useMemo(() => {
    if (isCrmMode && quotation?.deal_id) {
      return `/crm/deals/${quotation.deal_id}`;
    }
    return quotationListPath(mode);
  }, [isCrmMode, mode, quotation?.deal_id]);

  async function handleSubmitForReview() {
    setSubmitting(true);
    try {
      await submitQuotationForReview(quotationId);
      toast.success("Quotation submitted for approval.");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to submit quotation for approval.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await approveQuotation(quotationId);
      toast.success("Quotation approved.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve quotation.");
    } finally {
      setApproving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      await sendQuotation(quotationId);
      toast.success("Quotation sent to client.");
      setSendConfirmOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send quotation.");
    } finally {
      setSending(false);
    }
  }

  async function handleRevise() {
    setRevising(true);
    try {
      const revised = await reviseWorkspaceQuotation(quotationId);
      toast.success(`Revision ${revised.revision_label ?? "created"} ready for editing.`);
      router.push(quotationDetailPath(revised.id, "projects"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create revision.");
    } finally {
      setRevising(false);
    }
  }

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    try {
      await appendWorkspaceQuotationNegotiationNote(quotationId, noteBody.trim());
      setNoteBody("");
      toast.success("Negotiation note added.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleRecordDeposit() {
    const dealId = quotation?.deal_id;
    if (!dealId) {
      toast.error("No deal linked to this quotation.");
      return;
    }

    const amount = parseFloat(paymentForm.amount_paid);
    if (!paymentForm.payment_reference.trim() || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment reference and amount.");
      return;
    }

    setRecordingDeposit(true);
    try {
      await recordPayment(dealId, {
        payment_reference: paymentForm.payment_reference.trim(),
        payment_date: paymentForm.payment_date,
        amount_paid: amount,
        payment_method: paymentForm.payment_method,
        payment_status: "confirmed",
        quotation_id: quotationId,
        notes: paymentForm.notes.trim() || undefined,
      });
      setPaymentDialogOpen(false);
      setPaymentForm((f) => ({ ...f, payment_reference: "", amount_paid: "", notes: "" }));
      toast.success("Deposit recorded.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record deposit.");
    } finally {
      setRecordingDeposit(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Quotation not found.</div>
    );
  }

  const canNegotiate = quotation.sent_at && SENT_STATUSES.has(quotation.status ?? "");
  const canRevise = !isCrmMode && canNegotiate && !quotation.is_reference_copy && quotation.status !== "draft";
  const showComparison = !isCrmMode && referenceQuotation != null;
  const showDepositAction =
    isCrmMode && canNegotiate && quotation.deal_id && !hasRecordedDeposit(quotation.deal);
  const canSubmitForReview =
    quotation.status != null && SUBMITTABLE_QUOTATION_STATUSES.has(quotation.status);
  const canApprove =
    quotation.status != null && APPROVABLE_QUOTATION_STATUSES.has(quotation.status);
  const canSendToClient =
    quotation.status != null && SENDABLE_QUOTATION_STATUSES.has(quotation.status);
  const statusHelp = quotationStatusDescription(quotation.status);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={quotation.project_name ?? quotation.quotation_number ?? "Quotation"}
        subtitle={
          isCrmMode
            ? (quotation.deal?.name ??
              quotation.deal?.title ??
              quotation.deal?.reference ??
              quotation.quotation_number ??
              undefined)
            : `Project No. ${quotation.project_number ?? "—"} · ${quotation.revision_label ?? "v1"}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={backHref}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                {isCrmMode && quotation.deal_id ? "Back to Deal" : "Back"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={quotationPreviewPath(quotationId, mode)}>
                <Eye className="mr-1.5 h-4 w-4" />
                Preview / Print
              </Link>
            </Button>
            {canSubmitForReview ? (
              <PermissionGate permission="quotations.create">
                <Button onClick={() => void handleSubmitForReview()} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Submit for approval
                </Button>
              </PermissionGate>
            ) : null}
            {canApprove ? (
              <PermissionGate anyOf={[...QUOTATION_APPROVE_PERMISSIONS]}>
                <Button onClick={() => void handleApprove()} disabled={approving}>
                  {approving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve quotation
                </Button>
              </PermissionGate>
            ) : null}
            {canSendToClient ? (
              <PermissionGate anyOf={[...QUOTATION_RELEASE_PERMISSIONS]}>
                <Button onClick={() => setSendConfirmOpen(true)} disabled={sending}>
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to client
                </Button>
              </PermissionGate>
            ) : null}
            {showDepositAction ? (
              <PermissionGate permission="deal_payments.record">
                <Button onClick={() => setPaymentDialogOpen(true)}>
                  <Banknote className="mr-2 h-4 w-4" />
                  Record Deposit
                </Button>
              </PermissionGate>
            ) : null}
            {canRevise ? (
              <Button variant="secondary" onClick={() => void handleRevise()} disabled={revising}>
                {revising ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="mr-2 h-4 w-4" />
                )}
                Create Revision
              </Button>
            ) : null}
            {!isCrmMode ? (
              <Button variant="outline" onClick={() => setShowHistory((prev) => !prev)}>
                <History className="mr-1.5 h-4 w-4" />
                {showHistory ? "Hide History" : "View History"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="space-y-6 p-6">
        {statusHelp ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatQuotationStatus(quotation.status)}.
            </span>{" "}
            {statusHelp}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge>{formatQuotationStatus(quotation.status)}</Badge>
          {quotation.revision_label ? (
            <Badge variant="outline">{quotation.revision_label}</Badge>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {quotation.lines?.length ?? 0} line items ·{" "}
            {formatKes(currentSummary?.grandTotal ?? quotation.total_amount)}
          </span>
          {quotation.project_id ? (
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={projectDetailPath(quotation.project_id, mode)}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View project
              </Link>
            </Button>
          ) : null}
        </div>

        {hasUsdLines ? (
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 px-4 py-4 text-sm">
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label htmlFor="fx_rate" className="text-xs text-muted-foreground">
                  USD → KES rate
                </Label>
                {isCrmMode ? (
                  <p className="py-2 font-medium">
                    {effectiveRate ? effectiveRate.toLocaleString("en-KE") : "—"}
                    {exchangeRate ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {exchangeRate.label}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="fx_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={loadingRate ? "Loading…" : "Rate"}
                      value={manualOverride ?? effectiveRate ?? ""}
                      onChange={(e) => {
                        const parsed = Number.parseFloat(e.target.value);
                        setManualOverride(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={loadingRate}
                      onClick={() => void refreshRate()}
                      title="Refresh live rate"
                    >
                      <RefreshCw className={cn("h-4 w-4", loadingRate && "animate-spin")} />
                    </Button>
                  </div>
                )}
                {!isCrmMode && exchangeRate ? (
                  <p className="text-xs text-muted-foreground">{exchangeRate.label}</p>
                ) : isCrmMode && rateError ? (
                  <p className="text-xs text-destructive">{rateError}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canNegotiate && (quotation.negotiation_notes ?? []).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Negotiation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {(quotation.negotiation_notes ?? []).map((note) => (
                  <li key={note.id} className="rounded-md border p-3 text-sm">
                    <p>{note.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.author_name} · {new Date(note.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
              {!isCrmMode ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add negotiation note…"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddNote();
                    }}
                  />
                  <Button
                    onClick={() => void handleAddNote()}
                    disabled={addingNote || !noteBody.trim()}
                  >
                    {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : !isCrmMode && canNegotiate ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Negotiation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No negotiation notes yet. Record client feedback after sending.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Add negotiation note…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddNote();
                  }}
                />
                <Button onClick={() => void handleAddNote()} disabled={addingNote || !noteBody.trim()}>
                  {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isCrmMode && showHistory && (quotation.revision_history ?? []).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revision History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(quotation.revision_history ?? []).map((rev) => (
                  <li key={rev.id} className="flex items-center justify-between rounded-md border p-3">
                    <span>
                      {rev.revision_label ?? `v${rev.revision_number}`} · {rev.status} ·{" "}
                      {formatKes(
                        computePricingSummary(rev, hasUsdLines ? effectiveRate : null).grandTotal,
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rev.sent_at ? new Date(rev.sent_at).toLocaleDateString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {showComparison ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <QuotationLinesPanel
              quotation={referenceQuotation}
              role="reference"
              rate={hasUsdLines ? effectiveRate : null}
            />
            <QuotationLinesPanel
              quotation={quotation}
              role="current"
              rate={hasUsdLines ? effectiveRate : null}
            />
          </div>
        ) : (
          <QuotationLinesPanel
            quotation={quotation}
            role="current"
            rate={hasUsdLines ? effectiveRate : null}
          />
        )}
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record deposit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="quotation-payment-ref">Payment reference</Label>
              <Input
                id="quotation-payment-ref"
                value={paymentForm.payment_reference}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, payment_reference: e.target.value }))
                }
                placeholder="e.g. MPESA-ABC123"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quotation-payment-date">Payment date</Label>
              <Input
                id="quotation-payment-date"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quotation-payment-amount">Amount (KES)</Label>
              <Input
                id="quotation-payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount_paid}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, amount_paid: e.target.value }))
                }
                placeholder={
                  quotation.deal?.deposit_required_amount
                    ? String(quotation.deal.deposit_required_amount)
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
              <Label htmlFor="quotation-payment-notes">Notes (optional)</Label>
              <Textarea
                id="quotation-payment-notes"
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
            <Button onClick={() => void handleRecordDeposit()} disabled={recordingDeposit}>
              {recordingDeposit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send quotation to client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This releases the quotation to sales and marks it as sent to the client. The
            linked deal will move to the quotation-sent stage.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send to client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
