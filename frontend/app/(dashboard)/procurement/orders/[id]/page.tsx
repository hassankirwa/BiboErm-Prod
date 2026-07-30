"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  listSuppliers,
  updatePurchaseOrder,
  type PurchaseOrder,
  type Supplier,
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

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lineTotal(qty: string, unitPrice: string) {
  return parseNumber(qty) * parseNumber(unitPrice);
}

type EditableLine = {
  id: number;
  description: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  receivedQty: string;
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [tax, setTax] = useState("0");
  const [editableLines, setEditableLines] = useState<EditableLine[]>([]);

  const isEditable = order?.is_editable ?? canApprovePurchaseOrder(order?.status ?? "");

  const syncForm = (data: PurchaseOrder) => {
    setSupplierId(String(data.supplier_id));
    setExpectedDelivery(data.expected_delivery ?? "");
    setTax(String(data.tax ?? "0"));
    setEditableLines(
      (data.lines ?? []).map((line) => ({
        id: line.id,
        description: line.description,
        sku: line.sku ?? "—",
        quantity: String(line.quantity),
        unitPrice: String(line.unit_price),
        receivedQty: String(line.received_qty ?? "0"),
      })),
    );
  };

  useEffect(() => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }

    getPurchaseOrder(id)
      .then((res) => {
        setOrder(res.data);
        syncForm(res.data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load purchase order.");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    void listSuppliers({ per_page: 100 })
      .then((res) => setSuppliers(res.data.filter((supplier) => supplier.is_active)))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load suppliers.");
      });
  }, []);

  const supplierOptions = useMemo(() => suppliers, [suppliers]);

  const previewSubtotal = useMemo(
    () => editableLines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitPrice), 0),
    [editableLines],
  );
  const previewTax = parseNumber(tax);
  const previewTotal = previewSubtotal + previewTax;

  const updateLine = (lineId: number, patch: Partial<EditableLine>) => {
    setEditableLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
  };

  async function handleSave() {
    if (!order || !isEditable) {
      return;
    }

    const invalidQty = editableLines.some((line) => parseNumber(line.quantity) <= 0);
    if (invalidQty) {
      toast.error("Quantity must be greater than zero for every line.");
      return;
    }

    const invalidPrice = editableLines.some((line) => parseNumber(line.unitPrice) < 0);
    if (invalidPrice) {
      toast.error("Unit price cannot be negative.");
      return;
    }

    if (!supplierId) {
      toast.error("Select a supplier.");
      return;
    }

    setSaving(true);
    try {
      const res = await updatePurchaseOrder(order.id, {
        supplier_id: Number(supplierId),
        expected_delivery: expectedDelivery || null,
        tax: previewTax,
        lines: editableLines.map((line) => ({
          id: line.id,
          quantity: parseNumber(line.quantity),
          unit_price: parseNumber(line.unitPrice),
        })),
      });
      setOrder(res.data);
      syncForm(res.data);
      toast.success("Purchase order saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save purchase order.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!order) {
      return;
    }

    if (isEditable) {
      const invalidQty = editableLines.some((line) => parseNumber(line.quantity) <= 0);
      if (invalidQty) {
        toast.error("Quantity must be greater than zero for every line.");
        return;
      }
    }

    setApproving(true);
    try {
      if (isEditable) {
        await updatePurchaseOrder(order.id, {
          supplier_id: Number(supplierId),
          expected_delivery: expectedDelivery || null,
          tax: previewTax,
          lines: editableLines.map((line) => ({
            id: line.id,
            quantity: parseNumber(line.quantity),
            unit_price: parseNumber(line.unitPrice),
          })),
        });
      }

      const res = await approvePurchaseOrder(order.id);
      setOrder(res.data);
      syncForm(res.data);
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
        subtitle={
          isEditable
            ? "Edit supplier, delivery date, quantities, and prices before approving"
            : "Purchase order detail and supplier document"
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/procurement/orders">Back to orders</Link>
            </Button>
            {isEditable ? (
              <Button
                variant="secondary"
                disabled={saving || approving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : null}
            {canApprovePurchaseOrder(order.status) ? (
              <Button disabled={saving || approving} onClick={() => void handleApprove()}>
                {approving ? "Approving…" : "Approve"}
              </Button>
            ) : null}
            {(order.goods_receipts_count ?? 0) === 0 &&
            order.status !== "cancelled" &&
            order.status !== "draft" &&
            order.status !== "pending_approval" ? (
              <Button variant="secondary" asChild>
                <Link href={`/procurement/goods-receipts/create?po=${order.id}`}>Receive goods</Link>
              </Button>
            ) : null}
            <PurchaseOrderPdfPreviewButton order={order} size="default" variant="default" />
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="secondary" className={statusColors[order.status] ?? ""}>
            {formatStatus(order.status)}
          </Badge>
          {order.requisition ? (
            <span>
              Requisition: <code>{order.requisition.reference}</code>
            </span>
          ) : null}
          {transport ? (
            <span>
              Driver: <strong>{transport.driver_name ?? "—"}</strong>
              {transport.vehicle ? ` · ${transport.vehicle}` : ""}
            </span>
          ) : null}
        </div>

        {isEditable ? (
          <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="po-supplier">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="po-supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                      {supplier.is_preferred ? " · Preferred" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected-delivery">Expected delivery</Label>
              <Input
                id="expected-delivery"
                type="date"
                value={expectedDelivery}
                onChange={(event) => setExpectedDelivery(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-tax">Tax (KES)</Label>
              <Input
                id="po-tax"
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(event) => setTax(event.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Supplier: <strong>{order.supplier?.name ?? `#${order.supplier_id}`}</strong>
            </span>
            <span>
              Expected delivery: <strong>{order.expected_delivery ?? "—"}</strong>
            </span>
          </div>
        )}

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
              {isEditable
                ? editableLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>{line.sku}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto h-8 w-24 text-right"
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.id, { quantity: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">{line.receivedQty}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto h-8 w-28 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateLine(line.id, { unitPrice: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        KES{" "}
                        {lineTotal(line.quantity, line.unitPrice).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                : (order.lines ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>{line.sku ?? "—"}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{line.received_qty ?? "0"}</TableCell>
                      <TableCell className="text-right">
                        KES {Number(line.unit_price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        KES {Number(line.line_total).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-6 text-sm">
          <div>
            Subtotal:{" "}
            <strong>
              KES{" "}
              {(isEditable ? previewSubtotal : Number(order.subtotal)).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
          <div>
            Tax:{" "}
            <strong>
              KES{" "}
              {(isEditable ? previewTax : Number(order.tax)).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
          <div>
            Total:{" "}
            <strong>
              KES{" "}
              {(isEditable ? previewTotal : Number(order.total)).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
