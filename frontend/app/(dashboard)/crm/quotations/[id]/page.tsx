"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ChevronLeft,
  Download,
  Loader2,
  Pencil,
  Send,
  FileText,
} from "lucide-react";
import {
  downloadQuotationPdf,
  fetchQuotation,
  quotationAmount,
  quotationPdfUrl,
  sendQuotation,
  updateQuotation,
  type ApiQuotation,
  type QuotationLinePayload,
} from "@/lib/api/crm/quotations";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

/** Spec: discounts above this % of subtotal need `deals.approve_discount`. */
const DISCOUNT_THRESHOLD_PERCENT = 10;

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "-";
  return `KES ${num.toLocaleString()}`;
}

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const quotationId = Number(id);
  const { hasPermission } = useAuth();
  const canApproveDiscount = hasPermission("deals.approve_discount");

  const [quotation, setQuotation] = useState<ApiQuotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    valid_until: "",
    terms_conditions: "",
    discount_amount: "",
    lines: [] as QuotationLinePayload[],
  });

  const loadQuotation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchQuotation(quotationId);
      setQuotation(data);
      setEditForm({
        valid_until: data.valid_until?.slice(0, 10) ?? "",
        terms_conditions: data.terms_conditions ?? "",
        discount_amount: String(data.discount_amount ?? ""),
        lines: (data.lines ?? []).map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load quotation.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    loadQuotation();
  }, [loadQuotation]);

  const editSubtotal = useMemo(
    () =>
      editForm.lines.reduce(
        (sum, line) => sum + line.quantity * line.unit_price,
        0,
      ),
    [editForm.lines],
  );

  const editDiscount = parseFloat(editForm.discount_amount) || 0;
  const discountThreshold = editSubtotal * (DISCOUNT_THRESHOLD_PERCENT / 100);
  const discountExceedsThreshold =
    editSubtotal > 0 && editDiscount > discountThreshold;
  const discountBlocked = discountExceedsThreshold && !canApproveDiscount;

  async function handleSaveDraft() {
    if (discountBlocked) {
      toast.error(
        `Discount exceeds ${DISCOUNT_THRESHOLD_PERCENT}% of subtotal. Manager approval required.`,
      );
      return;
    }

    setActionLoading("save");
    try {
      await ensureCsrfCookie();
      const updated = await updateQuotation(quotationId, {
        valid_until: editForm.valid_until || null,
        terms_conditions: editForm.terms_conditions || null,
        discount_amount: editDiscount,
        lines: editForm.lines,
      });
      setQuotation(updated);
      setEditing(false);
      toast.success("Quotation updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update quotation.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSend() {
    setActionLoading("send");
    try {
      await ensureCsrfCookie();
      const updated = await sendQuotation(quotationId);
      setQuotation(updated);
      toast.success("Quotation sent.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to send quotation.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownload() {
    setActionLoading("download");
    try {
      await downloadQuotationPdf(
        quotationId,
        `${quotation?.quotation_number ?? "quotation"}.pdf`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "PDF download unavailable.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex h-full flex-col">
        <AppHeader
          title="Quotation"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/deals">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="p-6 text-sm text-destructive">
          {error ?? "Quotation not found."}
        </div>
      </div>
    );
  }

  const canSend =
    quotation.status === "draft" ||
    quotation.status === "internal_review" ||
    quotation.status === "revised";

  const isDraft = quotation.status === "draft";

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={quotation.quotation_number ?? `Quotation #${quotation.id}`}
        subtitle={
          quotation.deal
            ? (quotation.deal.name ??
              quotation.deal.title ??
              quotation.deal.reference)
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{quotation.status ?? "draft"}</Badge>
            {isDraft && (
              <Button
                size="sm"
                variant="outline"
                disabled={!!actionLoading}
                onClick={() => setEditing((v) => !v)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {editing ? "Cancel edit" : "Edit draft"}
              </Button>
            )}
            {canSend && (
              <Button
                size="sm"
                disabled={!!actionLoading}
                onClick={handleSend}
              >
                {actionLoading === "send" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={!!actionLoading}
              onClick={handleDownload}
              asChild={false}
            >
              {actionLoading === "download" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={quotationPdfUrl(quotationId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Open PDF
              </a>
            </Button>
            {quotation.deal_id && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/crm/deals/${quotation.deal_id}`}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Deal
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {editing && isDraft && (
          <Card className="border-border border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Edit draft quotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editForm.lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-4"
                >
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          lines: f.lines.map((l, i) =>
                            i === index
                              ? { ...l, description: e.target.value }
                              : l,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          lines: f.lines.map((l, i) =>
                            i === index
                              ? {
                                  ...l,
                                  quantity: parseFloat(e.target.value) || 0,
                                }
                              : l,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          lines: f.lines.map((l, i) =>
                            i === index
                              ? {
                                  ...l,
                                  unit_price: parseFloat(e.target.value) || 0,
                                }
                              : l,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-discount">Discount (KES)</Label>
                  <Input
                    id="edit-discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.discount_amount}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        discount_amount: e.target.value,
                      }))
                    }
                  />
                  {discountExceedsThreshold && (
                    <div
                      className={`flex items-start gap-2 rounded-md border p-2 text-xs ${
                        discountBlocked
                          ? "border-destructive/40 bg-destructive/5 text-destructive"
                          : "border-warning/40 bg-warning/5 text-warning"
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Discount exceeds {DISCOUNT_THRESHOLD_PERCENT}% threshold (
                        {formatCurrency(discountThreshold)}).
                        {discountBlocked
                          ? " You need deals.approve_discount to save."
                          : " Manager approval permission detected — you may save."}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-valid">Valid until</Label>
                  <Input
                    id="edit-valid"
                    type="date"
                    value={editForm.valid_until}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        valid_until: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-terms">Terms & conditions</Label>
                <Textarea
                  id="edit-terms"
                  value={editForm.terms_conditions}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      terms_conditions: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={!!actionLoading || discountBlocked}
                >
                  {actionLoading === "save" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save draft
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-medium">{formatCurrency(quotation.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Discount</p>
              <p className="font-medium">
                {formatCurrency(quotation.discount_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(quotationAmount(quotation))}
              </p>
            </div>
            {quotation.valid_until && (
              <div>
                <p className="text-xs text-muted-foreground">Valid until</p>
                <p className="font-medium">
                  {new Date(quotation.valid_until).toLocaleDateString()}
                </p>
              </div>
            )}
            {quotation.sent_at && (
              <div>
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="font-medium">
                  {new Date(quotation.sent_at).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            {!quotation.lines || quotation.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.line_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {quotation.terms_conditions && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
              {quotation.terms_conditions}
            </CardContent>
          </Card>
        )}

        <Separator />
      </div>
    </div>
  );
}

