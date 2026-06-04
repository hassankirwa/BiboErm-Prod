"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { GrnPutawaySelect } from "@/components/procurement/grn-putaway-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getGoodsReceipt,
  updateGoodsReceiptLines,
  type GoodsReceipt,
  type GoodsReceiptLine,
  type PurchaseOrderLine,
} from "@/lib/api/procurement";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
import {
  getLocationTree,
  listWarehouseItems,
  receiveStock,
  warehouseItemLabel,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";
import { toast } from "sonner";

type ReceiveLine = {
  grn_line_id: number;
  item_id: number;
  warehouse_item_category: string | null;
  quantity: number;
  to_bin_id: number | null;
};

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

function poLineDescription(
  grn: GoodsReceipt,
  grnLine: GoodsReceiptLine,
): string {
  const poLine = grn.purchaseOrder?.lines?.find(
    (line: PurchaseOrderLine) => line.id === grnLine.purchase_order_line_id,
  );
  return poLine?.description ?? `Line #${grnLine.id}`;
}

function isPutawayLine(line: GoodsReceiptLine): boolean {
  return Boolean(
    line.warehouse_item_id &&
      !line.is_procurement_only &&
      Number(line.qty_accepted || line.qty_received) > 0,
  );
}

export default function WarehouseReceivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grnId = Number(searchParams.get("grn") ?? "");
  const [grn, setGrn] = useState<GoodsReceipt | null>(null);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [locationTree, setLocationTree] = useState<WarehouseLocationTree[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [grnLoading, setGrnLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocationsLoading(true);
    setLocationsError(null);

    Promise.all([
      getLocationTree({ for_putaway: true }),
      listProjects({ per_page: 100 }),
      listWarehouseItems(),
    ])
      .then(([locationRes, projectsRes, itemsRes]) => {
        setLocationTree(locationRes.data ?? []);
        setProjects(projectsRes.data);
        setWarehouseItems(itemsRes);
      })
      .catch((error: Error) => {
        const message = error.message || "Failed to load form options.";
        setLocationsError(message);
        toast.error(message);
      })
      .finally(() => {
        setLocationsLoading(false);
        setOptionsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!Number.isFinite(grnId) || grnId <= 0) {
      setGrn(null);
      setLines([]);
      return;
    }

    setGrnLoading(true);
    getGoodsReceipt(grnId)
      .then((res) => {
        const data = res.data;
        setGrn(data);
        setProjectId(data.project_id ? String(data.project_id) : "");
        setNotes(data.notes?.trim() || `GRN ${data.grn_number} putaway`);
        setLines(
          (data.lines ?? [])
            .filter(isPutawayLine)
            .map((line) => ({
              grn_line_id: line.id,
              item_id: Number(line.warehouse_item_id),
              warehouse_item_category:
                (line.warehouse_item_category as string | null | undefined) ?? null,
              quantity: Number(line.qty_accepted || line.qty_received),
              to_bin_id: line.to_bin_id,
            })),
        );
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load GRN receive payload."))
      .finally(() => setGrnLoading(false));
  }, [grnId]);

  const procurementOnlyLines = useMemo(
    () =>
      grn
        ? (grn.lines ?? []).filter(
            (line) => line.is_procurement_only || !line.warehouse_item_id,
          )
        : [],
    [grn],
  );

  const grnLinesPayload = useMemo(
    () =>
      grn
        ? (grn.lines ?? []).map((grnLine) => {
            const draft = lines.find((entry) => entry.grn_line_id === grnLine.id);
            return {
              id: grnLine.id,
              qty_received: Number(grnLine.qty_received),
              qty_accepted: Number(grnLine.qty_accepted || grnLine.qty_received),
              qty_rejected: Number(grnLine.qty_rejected),
              rejection_reason: grnLine.rejection_reason,
              warehouse_item_id: grnLine.warehouse_item_id,
              to_bin_id: draft?.to_bin_id ?? grnLine.to_bin_id,
              notes: grnLine.notes,
            };
          })
        : [],
    [grn, lines],
  );

  const canSubmit = Boolean(grn) && !grnLoading;

  const submit = async () => {
    if (!grn) {
      toast.error("No goods receipt loaded.");
      return;
    }

    setSubmitting(true);
    try {
      await updateGoodsReceiptLines(grnId, {
        ...(grnLinesPayload.length > 0 ? { lines: grnLinesPayload } : {}),
        notes: notes || null,
        project_id: projectId ? Number(projectId) : null,
      });

      if (lines.length > 0) {
        await receiveStock({
          goods_receipt_id: grnId,
          project_id: projectId ? Number(projectId) : undefined,
          reference_type: "goods_receipt",
          notes: notes || undefined,
          lines: lines.map((line) => ({
            item_id: line.item_id,
            to_bin_id: line.to_bin_id ?? undefined,
            quantity: line.quantity,
          })),
        });
        toast.success("Stock received. Review updated levels on procurement stock.");
        router.push("/procurement/stock");
      } else {
        toast.success(
          "Putaway notes and project link saved. This GRN has no warehouse stock lines to receive.",
        );
        router.push(`/procurement/goods-receipts/${grn.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save receive details.");
    } finally {
      setSubmitting(false);
    }
  };

  const getItemLabel = (itemId: number) => {
    const item = warehouseItems.find((entry) => entry.id === itemId);
    return item ? warehouseItemLabel(item) : `Item #${itemId}`;
  };

  return (
    <PermissionGuard
      permissions={["warehouse.stock.receive"]}
      fallback={
        <div className="flex min-w-0 w-full flex-col">
          <AppHeader title="Receive Stock" subtitle="Put away inbound stock and optionally clear project shortages" />
          <div className="p-6 text-sm text-muted-foreground">
            Stock receiving is only available to warehouse staff with receive permission.
          </div>
        </div>
      }
    >
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader title="Receive Stock" subtitle="Put away inbound stock and optionally clear project shortages" />
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/warehouse/receive/create">Create GRN from PO</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/warehouse/receiving-logs">Receiving logs</Link>
            </Button>
            {grn ? (
              <Button variant="outline" asChild>
                <Link href={`/procurement/goods-receipts/${grn.id}`}>Open GRN</Link>
              </Button>
            ) : null}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{grn ? `Receive for ${grn.grn_number}` : "Manual receive"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grnLoading ? (
                <p className="text-sm text-muted-foreground">Loading goods receipt…</p>
              ) : null}
              {locationsError ? (
                <p className="text-sm text-destructive">{locationsError}</p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="receive-grn">Goods receipt</Label>
                  <Input
                    id="receive-grn"
                    value={grn ? grn.grn_number : grnId > 0 ? `GRN #${grnId}` : "No GRN linked"}
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receive-project">Project (optional)</Label>
                  <select
                    id="receive-project"
                    className={selectClassName}
                    value={projectId}
                    disabled={optionsLoading}
                    onChange={(event) => setProjectId(event.target.value)}
                  >
                    <option value="">
                      {optionsLoading ? "Loading projects…" : "No project linked"}
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.reference} · {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receive-notes">Putaway notes</Label>
                <Textarea
                  id="receive-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Reference GRN, carrier, or reservation notes…"
                />
              </div>

              {grn && lines.length === 0 && procurementOnlyLines.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-4 text-sm">
                  <p className="font-medium">Procurement-only items (no warehouse putaway)</p>
                  <p className="text-muted-foreground">
                    These lines are recorded on the GRN only. Save notes and the project link below;
                    stock levels are not updated.
                  </p>
                  <ul className="divide-y rounded-md border bg-background">
                    {procurementOnlyLines.map((line) => (
                      <li
                        key={line.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                      >
                        <span>{poLineDescription(grn, line)}</span>
                        <Badge variant="outline">Procurement only</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {grn && lines.length === 0 && procurementOnlyLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accepted quantities on this GRN yet. Open the GRN to verify quantities, or link
                  warehouse catalog items on PO lines first.
                </p>
              ) : null}

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={`${line.grn_line_id}-${line.item_id}`}
                    className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-3"
                  >
                    <div className="space-y-1.5 md:col-span-1">
                      <Label htmlFor={`receive-item-${index}`}>Warehouse item</Label>
                      <Input
                        id={`receive-item-${index}`}
                        readOnly
                        value={getItemLabel(line.item_id)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`receive-qty-${index}`}>Quantity to receive</Label>
                      <Input
                        id={`receive-qty-${index}`}
                        type="number"
                        min={0}
                        value={line.quantity}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, quantity: Number(event.target.value) }
                                : entry,
                            ),
                          )
                        }
                      />
                    </div>
                    <GrnPutawaySelect
                      id={`receive-bin-${index}`}
                      warehouseItemId={line.item_id}
                      warehouseItemCategory={line.warehouse_item_category}
                      toBinId={line.to_bin_id}
                      locationTree={locationTree}
                      warehouseItems={warehouseItems}
                      locationsLoading={locationsLoading}
                      locationsError={locationsError}
                      onChange={(toBinId) =>
                        setLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, to_bin_id: toBinId } : entry,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              {!grn ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setLines((current) => [
                      ...current,
                      {
                        grn_line_id: 0,
                        item_id: 0,
                        warehouse_item_category: null,
                        quantity: 0,
                        to_bin_id: null,
                      },
                    ])
                  }
                >
                  Add line
                </Button>
              ) : null}
              <Button
                className="w-full"
                disabled={submitting || !canSubmit}
                onClick={() => void submit()}
              >
                {submitting
                  ? "Saving…"
                  : lines.length > 0
                    ? "Save putaway & receive stock"
                    : "Save putaway notes & project link"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}
