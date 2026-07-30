"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Lock, PackageCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { GrnPutawaySelect } from "@/components/procurement/grn-putaway-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  getPutawayOptions,
  listWarehouseItems,
  receiveStock,
  warehouseItemLabel,
  type PutawayOptionsForItem,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";
import { cn } from "@/lib/utils";
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

function categoryBadgeLabel(category: string | null): string | null {
  switch (category) {
    case "aluminium_profile":
      return "Aluminium";
    case "accessory":
      return "Accessory";
    case "rubber":
      return "Rubber";
    default:
      return category;
  }
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
  const [putawayByItemId, setPutawayByItemId] = useState<
    Record<number, PutawayOptionsForItem>
  >({});
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [grnLoading, setGrnLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** When false, line qty/bin fields are confirmation-only. */
  const [editingPutaway, setEditingPutaway] = useState(false);

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
      setPutawayByItemId({});
      return;
    }

    setGrnLoading(true);
    getGoodsReceipt(grnId)
      .then(async (res) => {
        const data = res.data;
        setGrn(data);
        setProjectId(data.project_id ? String(data.project_id) : "");
        setNotes(data.notes?.trim() || `GRN ${data.grn_number} putaway`);
        setEditingPutaway(false);

        const putawayLines = (data.lines ?? []).filter(isPutawayLine);
        const itemIds = putawayLines
          .map((line) => Number(line.warehouse_item_id))
          .filter((id) => Number.isFinite(id) && id > 0);

        let putawayMap: Record<number, PutawayOptionsForItem> = {};
        if (itemIds.length > 0) {
          try {
            const putawayRes = await getPutawayOptions(itemIds);
            putawayMap = Object.fromEntries(
              (putawayRes.data ?? []).map((entry) => [
                entry.warehouse_item_id,
                entry,
              ]),
            );
          } catch {
            putawayMap = {};
          }
        }
        setPutawayByItemId(putawayMap);

        setLines(
          putawayLines.map((line) => {
            const itemId = Number(line.warehouse_item_id);
            const options = putawayMap[itemId];
            const category =
              (line.warehouse_item_category as string | null | undefined) ??
              options?.category ??
              null;
            const allowedBinIds = new Set(
              (options?.bins ?? []).map((bin) => bin.id),
            );
            // Drop stale bins from a wrong deck (e.g. aluminium cage on an accessory).
            const savedBinId = line.to_bin_id;
            const toBinId =
              savedBinId != null &&
              (allowedBinIds.size === 0 || allowedBinIds.has(savedBinId))
                ? savedBinId
                : (options?.suggested_bin_id ?? null);

            return {
              grn_line_id: line.id,
              item_id: itemId,
              warehouse_item_category: category,
              quantity: Number(line.qty_accepted || line.qty_received),
              to_bin_id: toBinId,
            };
          }),
        );
      })
      .catch((error: Error) =>
        toast.error(error.message || "Failed to load GRN receive payload."),
      )
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

    const missingBin = lines.find((line) => !line.to_bin_id);
    if (missingBin) {
      toast.error("Every putaway line needs a storage location.");
      setEditingPutaway(true);
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
          <AppHeader
            title="Receive Stock"
            subtitle="Confirm putaway locations and receive inbound stock"
          />
          <div className="p-4 text-sm text-muted-foreground sm:p-6">
            Stock receiving is only available to warehouse staff with receive permission.
          </div>
        </div>
      }
    >
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader
          title="Receive Stock"
          subtitle="Confirm putaway from receiving — edit only if you need a last-minute change"
        />
        <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/receive/create">Create GRN from PO</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/receiving-logs">Receiving logs</Link>
            </Button>
            {grn ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/procurement/goods-receipts/${grn.id}`}>Open GRN</Link>
              </Button>
            ) : null}
          </div>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="space-y-3 border-b bg-muted/20 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                    <PackageCheck className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 break-words">
                      {grn ? `Putaway · ${grn.grn_number}` : "Manual receive"}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Locations were set when the GRN was verified. Confirm below, then receive into
                    stock.
                  </CardDescription>
                </div>
                {lines.length > 0 ? (
                  <Button
                    type="button"
                    variant={editingPutaway ? "secondary" : "outline"}
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => setEditingPutaway((value) => !value)}
                  >
                    {editingPutaway ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Lock putaway
                      </>
                    ) : (
                      <>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit putaway
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
              {lines.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={editingPutaway ? "default" : "secondary"}>
                    {editingPutaway ? "Editing enabled" : "Confirmation mode"}
                  </Badge>
                  <Badge variant="outline">{lines.length} line{lines.length === 1 ? "" : "s"}</Badge>
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {grnLoading ? (
                <p className="text-sm text-muted-foreground">Loading goods receipt…</p>
              ) : null}
              {locationsError ? (
                <p className="text-sm text-destructive">{locationsError}</p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="receive-grn">Goods receipt</Label>
                  <Input
                    id="receive-grn"
                    value={
                      grn
                        ? grn.grn_number
                        : grnId > 0
                          ? `GRN #${grnId}`
                          : "No GRN linked"
                    }
                    readOnly
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receive-project">Project (optional)</Label>
                  <select
                    id="receive-project"
                    className={selectClassName}
                    value={projectId}
                    disabled={optionsLoading || (!editingPutaway && Boolean(grn))}
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
                  readOnly={!editingPutaway && Boolean(grn)}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Reference GRN, carrier, or reservation notes…"
                  className={cn(!editingPutaway && grn && "bg-muted/40")}
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
                        <span className="min-w-0 break-words">{poLineDescription(grn, line)}</span>
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
                {lines.map((line, index) => {
                  const category =
                    line.warehouse_item_category ??
                    putawayByItemId[line.item_id]?.category ??
                    null;
                  const categoryLabel = categoryBadgeLabel(category);

                  return (
                    <div
                      key={`${line.grn_line_id}-${line.item_id}`}
                      className={cn(
                        "min-w-0 space-y-3 rounded-lg border p-3 sm:p-4",
                        editingPutaway ? "border-primary/30 bg-background" : "bg-muted/15",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Line {index + 1}
                        </span>
                        {categoryLabel ? (
                          <Badge variant="outline" className="font-normal">
                            {categoryLabel}
                          </Badge>
                        ) : null}
                        {putawayByItemId[line.item_id]?.source === "accessories_deck" ? (
                          <Badge variant="secondary" className="font-normal">
                            Accessories bins
                          </Badge>
                        ) : null}
                      </div>

                      <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-12">
                        <div className="min-w-0 space-y-1.5 md:col-span-5">
                          <Label htmlFor={`receive-item-${index}`}>Warehouse item</Label>
                          <Input
                            id={`receive-item-${index}`}
                            readOnly
                            value={getItemLabel(line.item_id)}
                            className="bg-muted/40"
                            title={getItemLabel(line.item_id)}
                          />
                        </div>
                        <div className="min-w-0 space-y-1.5 md:col-span-2">
                          <Label htmlFor={`receive-qty-${index}`}>Qty</Label>
                          <Input
                            id={`receive-qty-${index}`}
                            type="number"
                            min={0}
                            value={line.quantity}
                            readOnly={!editingPutaway}
                            className={cn(!editingPutaway && "bg-muted/40")}
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
                        <div className="min-w-0 md:col-span-5">
                          <GrnPutawaySelect
                            id={`receive-bin-${index}`}
                            warehouseItemId={line.item_id}
                            warehouseItemCategory={category}
                            toBinId={line.to_bin_id}
                            locationTree={locationTree}
                            warehouseItems={warehouseItems}
                            putawayOptions={putawayByItemId[line.item_id] ?? null}
                            locationsLoading={locationsLoading}
                            locationsError={locationsError}
                            readOnly={!editingPutaway}
                            disabled={!editingPutaway}
                            onChange={(toBinId) =>
                              setLines((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, to_bin_id: toBinId }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                className="w-full sm:w-auto sm:min-w-[240px]"
                disabled={submitting || !canSubmit}
                onClick={() => void submit()}
              >
                {submitting
                  ? "Saving…"
                  : lines.length > 0
                    ? "Confirm putaway & receive stock"
                    : "Save putaway notes & project link"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}
