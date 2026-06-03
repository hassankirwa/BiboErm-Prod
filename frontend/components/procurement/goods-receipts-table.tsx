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
import { listGoodsReceipts, type GoodsReceipt } from "@/lib/api/procurement";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  verifying: "bg-warning/10 text-warning",
  verified: "bg-success/10 text-success",
};

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type GoodsReceiptsTableProps = {
  detailBasePath?: string;
  purchaseOrderId?: number;
};

export function GoodsReceiptsTable({
  detailBasePath = "/procurement/goods-receipts",
  purchaseOrderId,
}: GoodsReceiptsTableProps) {
  const [items, setItems] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listGoodsReceipts({
      per_page: 50,
      purchase_order_id: purchaseOrderId,
    })
      .then((res) => setItems(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [purchaseOrderId]);

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading receiving logs…</p>;
  }

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No goods receipt notes recorded yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>GRN</TableHead>
            <TableHead>PO</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Lines</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recorded by</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((grn) => (
            <TableRow key={grn.id}>
              <TableCell>
                <code className="text-sm">{grn.grn_number}</code>
              </TableCell>
              <TableCell>{grn.purchaseOrder?.reference ?? `#${grn.purchase_order_id}`}</TableCell>
              <TableCell>{grn.purchaseOrder?.supplier?.name ?? "—"}</TableCell>
              <TableCell>{formatDate(grn.received_at)}</TableCell>
              <TableCell>{grn.lines?.length ?? 0}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusColors[grn.status] ?? ""}>
                  {formatStatus(grn.status)}
                </Badge>
              </TableCell>
              <TableCell>{grn.creator?.name ?? "—"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`${detailBasePath}/${grn.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
