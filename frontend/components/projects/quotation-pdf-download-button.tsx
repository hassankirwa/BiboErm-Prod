"use client";

import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { downloadQuotationPdf } from "@/lib/api/crm/quotations";
import type { ApiQuotation } from "@/lib/api/crm/types";
import {
  downloadQuotationPdfFromElement,
  quotationPdfFilename,
} from "@/lib/projects/quotation-pdf-download";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type QuotationPdfDownloadButtonProps = {
  targetRef: RefObject<HTMLElement | null>;
  quotation: Pick<ApiQuotation, "project_number" | "quotation_number" | "id">;
  filename?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function QuotationPdfDownloadButton({
  targetRef,
  quotation,
  filename,
  variant = "outline",
  size = "default",
  className,
}: QuotationPdfDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    const resolvedFilename = filename ?? quotationPdfFilename(quotation);
    const element = targetRef.current;

    setDownloading(true);
    try {
      if (element) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        try {
          await downloadQuotationPdfFromElement(element, resolvedFilename);
          toast.success("Proforma quotation PDF downloaded.");
          return;
        } catch (clientError) {
          console.warn("Client PDF capture failed; trying server export.", clientError);
          if (!quotation.id) {
            throw clientError;
          }
        }
      }

      if (!quotation.id) {
        toast.error("Proforma quotation preview is not ready.");
        return;
      }

      await downloadQuotationPdf(quotation.id, resolvedFilename);
      toast.success("Proforma quotation PDF downloaded.");
    } catch (error) {
      console.error("Quotation PDF download failed:", error);
      toast.error(error instanceof Error ? error.message : "Could not download PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={downloading}
      onClick={() => void handleDownload()}
    >
      {downloading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Download PDF
    </Button>
  );
}
