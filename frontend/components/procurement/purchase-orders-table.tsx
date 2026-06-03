"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchaseOrderPdfPreviewButton } from "@/components/procurement/purchase-order-pdf-preview-dialog";
import type { PurchaseOrder } from "@/lib/api/procurement";
import { approvePurchaseOrder, listPurchaseOrders } from "@/lib/api/procurement";
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

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function canApprovePurchaseOrder(status: string): boolean {
  return status === "draft" || status === "pending_approval";
}

export function PurchaseOrdersTable() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const loadOrders = () =>
    listPurchaseOrders({ per_page: 50 })
      .then((res) => setOrders(res.data))
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: number) {
    setApprovingId(id);
    try {
      await approvePurchaseOrder(id);
      toast.success("Purchase order approved.");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve purchase order.");
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading purchase orders…</p>;
  }

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  if (orders.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No purchase orders yet.</p>;
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>PO Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((po) => (
            <TableRow key={po.id}>
              <TableCell>
                <Link href={`/procurement/orders/${po.id}`} className="hover:underline">
                  <code className="text-sm font-medium">{po.reference}</code>
                </Link>
              </TableCell>
              <TableCell>{po.supplier?.name ?? `#${po.supplier_id}`}</TableCell>
              <TableCell>
                {po.project
                  ? `${po.project.reference} · ${po.project.name}`
                  : po.project_id
                    ? `Project #${po.project_id}`
                    : "Stock order"}
              </TableCell>
              <TableCell>{po.lines?.length ?? 0} items</TableCell>
              <TableCell className="text-right font-medium">
                KES {Number(po.total).toLocaleString()}
              </TableCell>
              <TableCell>
                {po.expected_delivery
                  ? new Date(po.expected_delivery).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusColors[po.status] ?? ""}>
                  {formatStatus(po.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/procurement/orders/${po.id}`}>View details</Link>
                  </Button>
                  {canApprovePurchaseOrder(po.status) ? (
                    <Button
                      size="sm"
                      disabled={approvingId === po.id}
                      onClick={() => handleApprove(po.id)}
                    >
                      Approve
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/procurement/goods-receipts/create?po=${po.id}`}>Receive</Link>
                  </Button>
                  <PurchaseOrderPdfPreviewButton order={po} label="PDF" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
