"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { QuotationPreviewDocument } from "@/components/projects/quotation-preview-document";
import { QuotationPdfDownloadButton } from "@/components/projects/quotation-pdf-download-button";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchQuotationPreview,
  type QuotationPreviewData,
} from "@/lib/api/projects/quotations";
import type { FabricationItem } from "@/lib/api/projects/quotations";
import { ApiError } from "@/lib/api/errors";
import { buildQuotationExchangeRate } from "@/lib/currency/usd-to-kes";
import { useUsdToKesRate } from "@/lib/currency/use-usd-to-kes-rate";
import { quotationHasUsdLines } from "@/lib/currency/quotation-pricing";
import { quotationDetailPath, type QuotationViewMode } from "@/lib/quotations/paths";
import { ChevronLeft, Printer } from "lucide-react";
import { toast } from "sonner";

type QuotationPreviewViewProps = {
  quotationId: number;
  mode: QuotationViewMode;
  backHref?: string;
};

export function QuotationPreviewView({
  quotationId,
  mode,
  backHref,
}: QuotationPreviewViewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<QuotationPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const { rateInfo, effectiveRate, isManual } = useUsdToKesRate();

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setPreview(await fetchQuotationPreview(quotationId));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load preview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quotationId]);

  const delivery = useMemo(() => {
    const firstLine = preview?.quotation.lines?.[0];
    const fabrication = firstLine?.metadata?.fabrication as FabricationItem | undefined;
    return {
      deliveryDate: fabrication?.project?.delivery_date ?? null,
      deliveryDateIso: fabrication?.project?.delivery_date_iso ?? null,
    };
  }, [preview]);

  const exchangeRate = useMemo(() => {
    const lines = preview?.quotation.lines ?? [];
    if (!quotationHasUsdLines(lines)) return null;
    return buildQuotationExchangeRate(rateInfo, effectiveRate, isManual);
  }, [preview, rateInfo, effectiveRate, isManual]);

  const resolvedBackHref =
    backHref ?? quotationDetailPath(quotationId, mode);

  return (
    <div className="flex min-w-0 w-full flex-col print:bg-white">
      <div className="print:hidden">
        <AppHeader
          title="Quotation Preview"
          subtitle="Review and print the client-facing BIBO quotation document"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={resolvedBackHref}>
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Print
              </Button>
              {preview ? (
                <QuotationPdfDownloadButton
                  targetRef={previewRef}
                  quotation={preview.quotation}
                />
              ) : null}
            </div>
          }
        />
      </div>

      <div className="p-6 print:p-0">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : preview ? (
          <QuotationPreviewDocument
            ref={previewRef}
            quotation={preview.quotation}
            bankDetails={preview.bank_details}
            deliveryDate={delivery.deliveryDate}
            deliveryDateIso={delivery.deliveryDateIso}
            printMode
            showFabricationDetails={false}
            exchangeRate={exchangeRate}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">Preview unavailable.</p>
        )}
      </div>
    </div>
  );
}
