"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { GrnPutawaySelect } from "@/components/procurement/grn-putaway-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createGoodsReceipt,
  getPurchaseOrder,
  listPurchaseOrders,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from "@/lib/api/procurement";
import {
  getLocationTree,
  listWarehouseItems,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";
import { toast } from "sonner";

type DraftLine = {
  purchase_order_line_id: number;
  warehouse_item_id: number | null;
  warehouse_item_category: string | null;
  description: string;
  sku: string | null;
  order_qty: number;
  already_received: number;
  qty_received: number;
  to_bin_id: number | null;
  line_notes: string;
};

function remainingQty(line: PurchaseOrderLine) {
  return Math.max(0, Number(line.quantity) - Number(line.received_qty ?? 0));
}

type GoodsReceiptCreateFormProps = {
  backHref: string;
  detailBasePath: string;
  title?: string;
  subtitle?: string;
};

export function GoodsReceiptCreateForm({
  backHref,
  detailBasePath,
  title = "Create goods receipt",
  subtitle = "Log quantities received against a purchase order",
}: GoodsReceiptCreateFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPoId = Number(searchParams.get("po") ?? "");

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<number | "">(
    Number.isFinite(initialPoId) && initialPoId > 0 ? initialPoId : "",
  );
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingPo, setLoadingPo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationTree, setLocationTree] = useState<WarehouseLocationTree[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);

  useEffect(() => {
    setLocationsLoading(true);
    Promise.all([getLocationTree({ for_putaway: true }), listWarehouseItems()])
      .then(([locationRes, items]) => {
        setLocationTree(locationRes.data ?? []);
        setWarehouseItems(items);
        setLocationsError(null);
      })
      .catch((error: Error) => {
        setLocationTree([]);
        setWarehouseItems([]);
        setLocationsError(error.message || "Failed to load storage locations.");
      })
      .finally(() => setLocationsLoading(false));
  }, []);

  useEffect(() => {
    listPurchaseOrders({ per_page: 100, without_goods_receipts: true })
      .then((res) => {
        const eligible = res.data.filter((entry) => entry.status !== "cancelled");
        setOrders(eligible);

        if (
          Number.isFinite(initialPoId) &&
          initialPoId > 0 &&
          !eligible.some((entry) => entry.id === initialPoId)
        ) {
          toast.error(
            "This purchase order already has a goods receipt. Open receiving logs to continue.",
          );
          setSelectedPoId("");
        }
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load purchase orders."))
      .finally(() => setLoadingOrders(false));
  }, []);

  useEffect(() => {
    if (!selectedPoId) {
      setOrder(null);
      setLines([]);
      return;
    }

    setLoadingPo(true);
    getPurchaseOrder(Number(selectedPoId))
      .then((res) => {
        const po = res.data;
        setOrder(po);
        setLines(
          (po.lines ?? [])
            .map((line) => {
              const remaining = remainingQty(line);
              const itemId = line.warehouse_item_id ?? null;
              const item = warehouseItems.find((entry) => entry.id === itemId);

              return {
                purchase_order_line_id: line.id,
                warehouse_item_id: itemId,
                warehouse_item_category: item?.category ?? null,
                description: line.description,
                sku: line.sku ?? null,
                order_qty: Number(line.quantity),
                already_received: Number(line.received_qty ?? 0),
                qty_received: remaining,
                to_bin_id: null,
                line_notes: "",
              };
            })
            .filter((line) => line.qty_received > 0 || line.already_received < line.order_qty),
        );
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load purchase order."))
      .finally(() => setLoadingPo(false));
  }, [selectedPoId, warehouseItems]);

  const selectedLines = useMemo(() => lines.filter((line) => line.qty_received > 0), [lines]);

  const submit = async () => {
    if (!order || selectedLines.length === 0) {
      toast.error("Select a PO and enter at least one received quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createGoodsReceipt({
        purchase_order_id: order.id,
        project_id: order.project_id ?? undefined,
        notes: notes || undefined,
        quality_inspection_notes: qualityNotes || undefined,
        lines: selectedLines.map((line) => ({
          purchase_order_line_id: line.purchase_order_line_id,
          warehouse_item_id: line.warehouse_item_id ?? undefined,
          qty_received: line.qty_received,
          qty_accepted: line.qty_received,
          to_bin_id: line.to_bin_id,
          notes: line.line_notes || undefined,
        })),
      });
      toast.success("Goods receipt note created.");
      router.push(`${detailBasePath}/${res.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create goods receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button variant="outline" asChild>
            <Link href={backHref}>Back</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedPoId}
              disabled={loadingOrders}
              onChange={(event) =>
                setSelectedPoId(event.target.value ? Number(event.target.value) : "")
              }
            >
              <option value="">
                {loadingOrders
                  ? "Loading purchase orders…"
                  : orders.length === 0
                    ? "No purchase orders awaiting first receipt"
                    : "Select purchase order"}
              </option>
              {orders.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.reference} · {entry.supplier?.name ?? "Supplier"} · {entry.status}
                </option>
              ))}
            </select>
            {loadingPo ? (
              <p className="text-sm text-muted-foreground">Loading PO lines…</p>
            ) : order ? (
              <div className="rounded-lg border p-4 text-sm">
                <p>
                  Supplier: <strong>{order.supplier?.name ?? "—"}</strong>
                </p>
                <p className="text-muted-foreground">
                  {order.requisition?.reference
                    ? `Requisition ${order.requisition.reference}`
                    : "General procurement"}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {order ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Received quantities & putaway</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {locationsError ? (
                  <p className="text-sm text-destructive">{locationsError}</p>
                ) : null}
                {lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All PO lines are fully received.
                  </p>
                ) : (
                  lines.map((line) => (
                    <div key={line.purchase_order_line_id} className="rounded-lg border p-4">
                      <div className="mb-3">
                        <p className="font-medium">{line.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.sku ?? "No SKU"} · Ordered {line.order_qty} · Already received{" "}
                          {line.already_received}
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder="Qty received"
                          value={line.qty_received}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.purchase_order_line_id === line.purchase_order_line_id
                                  ? { ...entry, qty_received: Number(event.target.value) }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <GrnPutawaySelect
                          id={`create-putaway-${line.purchase_order_line_id}`}
                          warehouseItemId={line.warehouse_item_id}
                          warehouseItemCategory={line.warehouse_item_category}
                          toBinId={line.to_bin_id}
                          locationTree={locationTree}
                          warehouseItems={warehouseItems}
                          locationsLoading={locationsLoading}
                          locationsError={locationsError}
                          onChange={(toBinId) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.purchase_order_line_id === line.purchase_order_line_id
                                  ? { ...entry, to_bin_id: toBinId }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <Input
                          placeholder="Line notes"
                          value={line.line_notes}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.purchase_order_line_id === line.purchase_order_line_id
                                  ? { ...entry, line_notes: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receiving notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="General receiving notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Textarea
                  placeholder="Quality inspection notes (condition, packaging, damage, etc.)"
                  value={qualityNotes}
                  onChange={(event) => setQualityNotes(event.target.value)}
                />
                <Button disabled={submitting || selectedLines.length === 0} onClick={() => void submit()}>
                  {submitting ? "Creating…" : "Create goods receipt note"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
