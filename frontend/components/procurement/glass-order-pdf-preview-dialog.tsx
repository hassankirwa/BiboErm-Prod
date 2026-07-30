"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GlassOrder } from "@/lib/api/procurement";
import { buildGlassOrderPdfHtml, printGlassOrderDocument } from "@/lib/procurement/glass-order-pdf";
import { Printer } from "lucide-react";
import { toast } from "sonner";

type GlassOrderPdfPreviewDialogProps = {
  order: GlassOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlassOrderPdfPreviewDialog({
  order,
  open,
  onOpenChange,
}: GlassOrderPdfPreviewDialogProps) {
  const previewHtml = useMemo(() => {
    if (!open) return "";
    const logoUrl =
      typeof window !== "undefined"
        ? new URL("/bibo-logo.png", window.location.origin).href
        : "/bibo-logo.png";
    return buildGlassOrderPdfHtml(order, { logoUrl });
  }, [order, open]);

  const handlePrint = () => {
    try {
      printGlassOrderDocument(order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open print dialog.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-4 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Supplier document preview</DialogTitle>
          <DialogDescription>
            Review the glass purchase order for {order.order_number}
            {order.supplier?.name ? ` · ${order.supplier.name}` : ""} before printing.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-6">
          <iframe
            title={`Glass purchase order ${order.order_number}`}
            srcDoc={previewHtml}
            className="h-[min(70vh,820px)] w-full rounded-md border bg-white"
          />
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
