"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Download,
  Loader2,
  Send,
  FileText,
} from "lucide-react";
import {
  downloadQuotationPdf,
  fetchQuotation,
  quotationAmount,
  quotationPdfUrl,
  sendQuotation,
  type ApiQuotation,
} from "@/lib/api/crm/quotations";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

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
  const [quotation, setQuotation] = useState<ApiQuotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadQuotation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchQuotation(quotationId);
      setQuotation(data);
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

