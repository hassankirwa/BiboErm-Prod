"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildPurchaseOrderPdfHtml } from "@/lib/procurement/purchase-order-pdf-html";
import { getPurchaseOrder, type PurchaseOrder } from "@/lib/api/procurement";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PurchaseOrderPdfPreviewDialogProps = {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PurchaseOrder | null;
};

export function PurchaseOrderPdfPreviewDialog({
  order,
  open,
  onOpenChange,
  document,
}: PurchaseOrderPdfPreviewDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const doc = document ?? order;

  const previewHtml = useMemo(() => {
    if (!open || !doc) return "";
    const logoUrl =
      typeof window !== "undefined"
        ? new URL("/bibo-logo.png", window.location.origin).href
        : "/bibo-logo.png";
    return buildPurchaseOrderPdfHtml(doc, { logoUrl });
  }, [doc, open]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadPurchaseOrderPdfFile } = await import(
        "@/lib/procurement/purchase-order-pdf-download"
      );
      await downloadPurchaseOrderPdfFile(doc);
      toast.success("Purchase order PDF downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-4 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Supplier document preview</DialogTitle>
          <DialogDescription>
            Review the purchase order for {doc.reference} before downloading.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-6">
          <iframe
            title={`Purchase order ${doc.reference}`}
            srcDoc={previewHtml}
            className="h-[min(70vh,820px)] w-full rounded-md border bg-white"
          />
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={downloading} onClick={() => void handleDownload()}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PurchaseOrderPdfPreviewButtonProps = {
  order: PurchaseOrder;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function PurchaseOrderPdfPreviewButton({
  order,
  label = "Supplier PDF",
  size = "sm",
  variant = "outline",
}: PurchaseOrderPdfPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<PurchaseOrder | null>(null);

  const openPreview = async () => {
    setLoading(true);
    try {
      let doc = order;
      if (!doc.lines?.length || !doc.supplier) {
        const res = await getPurchaseOrder(doc.id);
        doc = res.data;
      }
      setDocument(doc);
      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load purchase order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size={size} variant={variant} disabled={loading} onClick={() => void openPreview()}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Eye className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      <PurchaseOrderPdfPreviewDialog
        order={order}
        document={document}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
