"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurchaseOrderPdfPreviewButton } from "@/components/procurement/purchase-order-pdf-preview-dialog";
import {
  approvePurchaseOrder,
  getPurchaseOrder,
  type PurchaseOrder,
} from "@/lib/api/procurement";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  sent: "bg-info/10 text-info",
  partial_received: "bg-chart-4/10 text-chart-4",
  received: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function canApprovePurchaseOrder(status: string): boolean {
  return status === "draft" || status === "pending_approval";
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }

    getPurchaseOrder(id)
      .then((res) => setOrder(res.data))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load purchase order.");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleApprove() {
    if (!order) {
      return;
    }

    setApproving(true);
    try {
      const res = await approvePurchaseOrder(order.id);
      setOrder(res.data);
      toast.success("Purchase order approved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve purchase order.");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading purchase order…</p>;
  }

  if (!order) {
    return <p className="p-6 text-sm text-destructive">Purchase order not found.</p>;
  }

  const transport = order.transport_orders?.[0];

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={order.reference}
        subtitle="Purchase order detail and supplier document"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/procurement/orders">Back to orders</Link>
            </Button>
            {canApprovePurchaseOrder(order.status) ? (
              <Button disabled={approving} onClick={() => void handleApprove()}>
                Approve
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <Link href={`/procurement/goods-receipts/create?po=${order.id}`}>Receive goods</Link>
            </Button>
            <PurchaseOrderPdfPreviewButton order={order} size="default" variant="default" />
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="secondary" className={statusColors[order.status] ?? ""}>
            {formatStatus(order.status)}
          </Badge>
          <span>Supplier: <strong>{order.supplier?.name ?? `#${order.supplier_id}`}</strong></span>
          {order.requisition ? (
            <span>Requisition: <code>{order.requisition.reference}</code></span>
          ) : null}
          {transport ? (
            <span>
              Driver: <strong>{transport.driver_name ?? "—"}</strong>
              {transport.vehicle ? ` · ${transport.vehicle}` : ""}
            </span>
          ) : null}
        </div>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Order qty</TableHead>
                <TableHead className="text-right">Confirmed in warehouse</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.lines ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.sku ?? "—"}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{line.received_qty ?? "0"}</TableCell>
                  <TableCell className="text-right">KES {Number(line.unit_price).toLocaleString()}</TableCell>
                  <TableCell className="text-right">KES {Number(line.line_total).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-6 text-sm">
          <div>Subtotal: <strong>KES {Number(order.subtotal).toLocaleString()}</strong></div>
          <div>Tax: <strong>KES {Number(order.tax).toLocaleString()}</strong></div>
          <div>Total: <strong>KES {Number(order.total).toLocaleString()}</strong></div>
        </div>
      </div>
    </div>
  );
}
