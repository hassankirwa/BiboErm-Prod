"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { WarehouseNativeSelect } from "@/components/warehouse/warehouse-native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adjustProjectReservation,
  getProject,
  getProjectMaterialStatus,
  projectLabel,
  reserveProjectMaterials,
  type ProjectDetail,
  type ProjectMaterialStatus,
} from "@/lib/api/projects";
import {
  listReservations,
  releaseProjectMaterials,
  type StockReservation,
} from "@/lib/api/warehouse";
import { fetchUsers } from "@/lib/api/users";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

const RESERVE_STAGES = new Set([
  "material_check",
  "awaiting_procurement",
  "materials_reserved",
]);

const RELEASE_STAGES = new Set([
  "awaiting_procurement",
  "materials_reserved",
  "materials_ready",
  "materials_released",
]);

const CATEGORY_ORDER = ["aluminium", "accessory", "rubber", "other"] as const;

function categoryLabel(raw: string | undefined | null): string {
  const value = (raw ?? "other").toLowerCase();
  if (value.includes("alum")) return "Aluminium";
  if (value.includes("accessor") || value.includes("hardware")) return "Accessory";
  if (value.includes("rubber") || value.includes("seal")) return "Rubber";
  return "Other";
}

function categoryKey(raw: string | undefined | null): (typeof CATEGORY_ORDER)[number] {
  const label = categoryLabel(raw).toLowerCase();
  if (label === "aluminium") return "aluminium";
  if (label === "accessory") return "accessory";
  if (label === "rubber") return "rubber";
  return "other";
}

type ChecklistRow = {
  itemId: number;
  sku: string;
  name: string;
  category: string;
  categoryKey: (typeof CATEGORY_ORDER)[number];
  reserved: number;
  released: number;
  remaining: number;
  uom: string;
};

type ReservationsWorkbenchProps = {
  projectId: number;
};

type AdjustDrafts = Record<string, string>;

export function ReservationsWorkbench({ projectId }: ReservationsWorkbenchProps) {
  const { hasPermission } = useAuth();
  const canReserve = hasPermission("warehouse.reservations.create");
  const canRelease = hasPermission("warehouse.reservations.release");

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [materialStatus, setMaterialStatus] = useState<ProjectMaterialStatus | null>(null);
  const [reservations, setReservations] = useState<StockReservation[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [adjustingKey, setAdjustingKey] = useState<string | null>(null);
  const [adjustDrafts, setAdjustDrafts] = useState<AdjustDrafts>({});
  const [receivedBy, setReceivedBy] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [releaseQtyDrafts, setReleaseQtyDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    try {
      const [projectRes, statusRes, reservationsRes] = await Promise.all([
        getProject(projectId),
        getProjectMaterialStatus(projectId),
        listReservations({ project_id: projectId, per_page: 20 }),
      ]);
      setProject(projectRes.data);
      setMaterialStatus(statusRes.data);
      setReservations(reservationsRes.data);
    } catch (error) {
      if (!opts?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load workbench.");
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchUsers({ status: "active", page: 1 })
      .then((res) =>
        setUsers(
          (res.data ?? []).map((user) => ({
            id: user.id,
            name: user.name,
          })),
        ),
      )
      .catch(() => setUsers([]));
  }, []);

  const activeReservation = useMemo(
    () =>
      reservations.find((row) => row.status === "pending" || row.status === "partial") ?? null,
    [reservations],
  );

  const checklistRows = useMemo((): ChecklistRow[] => {
    const lines = activeReservation?.lines ?? [];
    const byItem = new Map<number, ChecklistRow>();

    for (const line of lines) {
      const reserved = Number(line.quantity_reserved ?? 0);
      const released = Number(line.quantity_released ?? 0);
      const remaining =
        line.quantity_remaining != null
          ? Number(line.quantity_remaining)
          : Math.max(0, reserved - released);
      const existing = byItem.get(line.item_id);
      if (existing) {
        existing.reserved += reserved;
        existing.released += released;
        existing.remaining += remaining;
        continue;
      }
      const cat = line.item?.category ?? null;
      byItem.set(line.item_id, {
        itemId: line.item_id,
        sku: line.item?.sku ?? `Item #${line.item_id}`,
        name: line.item?.name ?? "—",
        category: categoryLabel(cat),
        categoryKey: categoryKey(cat),
        reserved,
        released,
        remaining,
        uom: line.item?.unit_of_measure ?? "",
      });
    }

    return Array.from(byItem.values())
      .filter((row) => row.reserved > 0)
      .sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.categoryKey);
        const bi = CATEGORY_ORDER.indexOf(b.categoryKey);
        if (ai !== bi) return ai - bi;
        return a.sku.localeCompare(b.sku);
      });
  }, [activeReservation]);

  const remainingChecklistRows = useMemo(
    () => checklistRows.filter((row) => row.remaining > 0.0005),
    [checklistRows],
  );

  const releaseProgress = useMemo(() => {
    const byCategory = new Map<string, { reserved: number; released: number }>();
    let reserved = 0;
    let released = 0;
    for (const row of checklistRows) {
      reserved += row.reserved;
      released += row.released;
      const bucket = byCategory.get(row.category) ?? { reserved: 0, released: 0 };
      bucket.reserved += row.reserved;
      bucket.released += row.released;
      byCategory.set(row.category, bucket);
    }
    return { reserved, released, byCategory };
  }, [checklistRows]);

  useEffect(() => {
    const nextSelected = new Set<number>();
    const nextDrafts: Record<number, string> = {};
    for (const row of remainingChecklistRows) {
      nextSelected.add(row.itemId);
      nextDrafts[row.itemId] = String(row.remaining);
    }
    setSelectedItemIds(nextSelected);
    setReleaseQtyDrafts(nextDrafts);
  }, [remainingChecklistRows]);

  const warehouseLines = useMemo(
    () => (materialStatus?.lines ?? []).filter((line) => !line.is_procurement_only),
    [materialStatus],
  );

  const availabilityRows = useMemo(() => {
    const aluminiumByItem = new Map<
      number,
      {
        key: string;
        warehouse_item_id: number;
        material_name: string;
        material_code: string | null;
        cutParts: string[];
        cuts_total: number;
        reserved_qty: string;
        reservation_target_qty: string;
        reservation_uom: string;
        warehouse_available: string | null;
        offcut_usable: string | null;
        bars_needed: number | null;
        shortage_qty: string;
        is_fully_reserved: boolean;
      }
    >();
    const other: typeof warehouseLines = [];

    for (const line of warehouseLines) {
      const isAluminium =
        Boolean(line.is_combined_aluminium) ||
        line.line_type === "aluminium_profile" ||
        line.bars_needed != null;
      if (!isAluminium || !line.warehouse_item_id) {
        other.push(line);
        continue;
      }

      const existing = aluminiumByItem.get(line.warehouse_item_id);
      const cutLabel = `${Number(line.required_qty)}×${line.measurement_mm ?? "?"}mm`;
      if (!existing) {
        aluminiumByItem.set(line.warehouse_item_id, {
          key: `alu-${line.warehouse_item_id}`,
          warehouse_item_id: line.warehouse_item_id,
          material_name: line.material_name,
          material_code: line.material_code,
          cutParts: [cutLabel],
          cuts_total: line.sku_cuts_total ?? Number(line.required_qty),
          reserved_qty: line.reserved_qty,
          reservation_target_qty: line.reservation_target_qty ?? line.required_qty,
          reservation_uom: line.reservation_uom ?? "metre",
          warehouse_available: line.warehouse_available ?? null,
          offcut_usable: line.offcut_usable ?? null,
          bars_needed: line.bars_needed ?? null,
          shortage_qty: line.shortage_qty,
          is_fully_reserved: Boolean(line.is_fully_reserved),
        });
      } else {
        existing.cutParts.push(cutLabel);
        if (Number(existing.shortage_qty) <= 0 && Number(line.shortage_qty) > 0) {
          existing.shortage_qty = line.shortage_qty;
        }
        if (line.is_fully_reserved) {
          existing.is_fully_reserved = true;
        }
      }
    }

    return {
      aluminium: Array.from(aluminiumByItem.values()),
      other,
    };
  }, [warehouseLines]);

  useEffect(() => {
    const next: AdjustDrafts = {};
    for (const row of availabilityRows.aluminium) {
      next[row.key] = Number(row.reserved_qty).toFixed(3);
    }
    for (const line of availabilityRows.other) {
      next[`other-${line.bom_line_id}`] = Number(line.reserved_qty).toFixed(3);
    }
    setAdjustDrafts(next);
  }, [availabilityRows]);

  function applyOptimisticHeldQty(opts: {
    itemId: number;
    bomLineRef?: string;
    quantity: string;
  }): ProjectMaterialStatus | null {
    if (!materialStatus) {
      return null;
    }

    const previous = materialStatus;
    const qty = Number(opts.quantity).toFixed(3);
    const isAluminiumAdjust = !opts.bomLineRef;

    let unitDelta = 0;
    let lineFullyDelta = 0;
    const seenAluminium = new Set<number>();

    const nextLines = previous.lines.map((line) => {
      const matches = opts.bomLineRef
        ? String(line.bom_line_id) === opts.bomLineRef
        : line.warehouse_item_id === opts.itemId;

      if (!matches || line.is_procurement_only) {
        return line;
      }

      const target = Number(line.reservation_target_qty ?? line.required_qty);
      const wasFull = Number(line.reserved_qty) >= target && target > 0;
      const nowFull = Number(qty) >= target && target > 0;

      if (isAluminiumAdjust && line.warehouse_item_id != null) {
        if (!seenAluminium.has(line.warehouse_item_id)) {
          seenAluminium.add(line.warehouse_item_id);
          if (!wasFull && nowFull) unitDelta += 1;
          if (wasFull && !nowFull) unitDelta -= 1;
        }
      } else {
        if (!wasFull && nowFull) unitDelta += 1;
        if (wasFull && !nowFull) unitDelta -= 1;
      }

      if (!wasFull && nowFull) lineFullyDelta += 1;
      if (wasFull && !nowFull) lineFullyDelta -= 1;

      return {
        ...line,
        reserved_qty: qty,
        is_fully_reserved: nowFull,
        shortage_qty: nowFull ? "0.000" : line.shortage_qty,
      };
    });

    const unitsTotal =
      previous.summary.reservation_units_total ?? previous.summary.warehouse_lines;
    const prevUnitsReserved =
      previous.summary.reservation_units_reserved ?? previous.summary.fully_reserved;
    const nextUnitsReserved = Math.max(0, prevUnitsReserved + unitDelta);
    const reservationComplete = unitsTotal > 0 && nextUnitsReserved >= unitsTotal;

    setMaterialStatus({
      ...previous,
      lines: nextLines,
      summary: {
        ...previous.summary,
        fully_reserved: Math.max(0, previous.summary.fully_reserved + lineFullyDelta),
        reservation_units_reserved: nextUnitsReserved,
        reservation_complete: reservationComplete,
        can_reserve_now: previous.summary.can_fully_reserve && !reservationComplete,
      },
    });
    setAdjustDrafts((drafts) => {
      const next = { ...drafts };
      if (opts.bomLineRef) {
        next[`other-${opts.bomLineRef}`] = qty;
      } else {
        next[`alu-${opts.itemId}`] = qty;
      }
      return next;
    });

    return previous;
  }

  async function handleReserve() {
    setReserving(true);
    try {
      const response = await reserveProjectMaterials(projectId);
      if (!response.success) {
        toast.error(response.message ?? "Could not reserve materials.");
        return;
      }
      toast.success(
        response.topped_up
          ? "Reservation topped up — only missing quantities were held."
          : "Materials reserved for this project (stock held, not deducted yet).",
      );
      await load({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reserve materials.");
    } finally {
      setReserving(false);
    }
  }

  async function handleAdjust(opts: {
    key: string;
    itemId: number;
    bomLineRef?: string;
    uomLabel: string;
    quantity?: number | string;
  }) {
    const raw = opts.quantity ?? adjustDrafts[opts.key];
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter a valid reserved quantity (0 or more).");
      return;
    }

    const quantity = qty.toFixed(3);
    const snapshot = applyOptimisticHeldQty({
      itemId: opts.itemId,
      bomLineRef: opts.bomLineRef,
      quantity,
    });

    setAdjustingKey(opts.key);
    try {
      const response = await adjustProjectReservation(projectId, {
        item_id: opts.itemId,
        quantity_reserved: quantity,
        bom_line_ref: opts.bomLineRef,
        notes: "Manual reservation adjustment",
      });
      if (!response.success) {
        if (snapshot) setMaterialStatus(snapshot);
        toast.error(response.message ?? "Could not adjust reservation.");
        return;
      }
      toast.success(
        `Held set to ${response.quantity_reserved} ${opts.uomLabel} (was ${response.previous_qty}).`,
      );
      void load({ silent: true });
    } catch (error) {
      if (snapshot) setMaterialStatus(snapshot);
      toast.error(error instanceof Error ? error.message : "Failed to adjust reservation.");
    } finally {
      setAdjustingKey(null);
    }
  }

  async function handleRelease(mode: "selected" | "all_remaining") {
    if (!receivedBy) {
      toast.error("Select who received the materials.");
      return;
    }
    if (remainingChecklistRows.length === 0) {
      toast.error("Nothing left to release on this reservation.");
      return;
    }

    let lines: Array<{ item_id: number; quantity: number }> | undefined;

    if (mode === "selected") {
      const picked: Array<{ item_id: number; quantity: number }> = [];
      for (const row of remainingChecklistRows) {
        if (!selectedItemIds.has(row.itemId)) continue;
        const raw = releaseQtyDrafts[row.itemId] ?? String(row.remaining);
        const qty = Number(raw);
        if (!Number.isFinite(qty) || qty <= 0) {
          toast.error(`Enter a valid release qty for ${row.sku}.`);
          return;
        }
        if (qty > row.remaining + 0.0005) {
          toast.error(`${row.sku}: cannot release more than remaining (${row.remaining}).`);
          return;
        }
        picked.push({ item_id: row.itemId, quantity: qty });
      }
      if (picked.length === 0) {
        toast.error("Select at least one line to release.");
        return;
      }
      lines = picked;
    }

    setReleasing(true);
    try {
      const result = await releaseProjectMaterials(projectId, {
        received_by: Number(receivedBy),
        notes: releaseNotes.trim() || undefined,
        ...(lines ? { lines } : {}),
      });
      const partial = result.data?.is_partial;
      toast.success(
        partial
          ? "Partial release recorded — remaining stock stays reserved for later stages."
          : "Materials fully released — stock deducted and handed to receiver.",
      );
      setReleaseNotes("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to release materials.");
    } finally {
      setReleasing(false);
    }
  }

  function toggleChecklistItem(itemId: number, checked: boolean) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  function toggleCategory(category: string, checked: boolean) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      for (const row of remainingChecklistRows) {
        if (row.category !== category) continue;
        if (checked) next.add(row.itemId);
        else next.delete(row.itemId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" />
        Loading project materials…
      </div>
    );
  }

  if (!project || !materialStatus) {
    return (
      <p className="text-sm text-muted-foreground">
        Project not found.{" "}
        <Link href="/warehouse/reservations" className="underline">
          Back to list
        </Link>
      </p>
    );
  }

  const summary = materialStatus.summary;
  const stage = project.stage;
  const unitsTotal = summary.reservation_units_total ?? summary.warehouse_lines;
  const unitsReserved =
    summary.reservation_units_reserved ?? summary.fully_reserved;
  const fullyReserved =
    typeof summary.reservation_complete === "boolean"
      ? summary.reservation_complete
      : unitsTotal > 0 && unitsReserved >= unitsTotal;
  const hasPartialHold = activeReservation !== null && !fullyReserved;
  const hasRemainingToRelease = remainingChecklistRows.length > 0;
  const showReserve =
    canReserve && RESERVE_STAGES.has(stage) && Boolean(summary.can_reserve_now);
  const showAdjust =
    canReserve && RESERVE_STAGES.has(stage) && (activeReservation !== null || showReserve);
  const showRelease =
    canRelease &&
    RELEASE_STAGES.has(stage) &&
    activeReservation !== null &&
    fullyReserved &&
    hasRemainingToRelease;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{projectLabel(project)}</h2>
          <p className="text-sm text-muted-foreground">
            Stage: {stage.replace(/_/g, " ")} · BOM v{materialStatus.bom_version ?? "—"}
            {materialStatus.fifo_position ? ` · FIFO #${materialStatus.fifo_position}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            Reserved {unitsReserved}/{unitsTotal}
            {summary.reservation_units_total != null ? " units" : ""}
          </Badge>
          <Badge variant={summary.shortage_lines > 0 ? "destructive" : "secondary"}>
            Procurement shortage {summary.shortage_lines}
          </Badge>
          {summary.can_fully_reserve ? (
            <Badge className="bg-success/15 text-success">WH can cover</Badge>
          ) : (
            <Badge variant="outline">WH short</Badge>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}`}>Project detail</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reserve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Holds stock for this project (FIFO). Does not deduct on-hand until release handover.
              {hasPartialHold
                ? " Top-up only books the missing gap — already held lines are left alone."
                : ""}
            </p>
            {showReserve ? (
              <Button size="sm" onClick={() => void handleReserve()} disabled={reserving}>
                {reserving ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                {hasPartialHold ? "Top up missing" : "Reserve materials"}
              </Button>
            ) : (
              <p className="text-muted-foreground">
                {fullyReserved
                  ? "All reservation units are already reserved to this project (aluminium profiles count once per SKU)."
                  : summary.can_fully_reserve
                    ? "Reservation is available once the project is in a reserve-eligible stage."
                    : "Cannot reserve yet — warehouse stock (including offcuts/bars) is short or held for earlier FIFO projects."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Release to production</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activeReservation ? (
              <p>
                Active reservation{" "}
                <span className="font-medium">{activeReservation.reservation_number}</span> (
                {activeReservation.status})
              </p>
            ) : (
              <p className="text-muted-foreground">No active reservation to release.</p>
            )}
            {checklistRows.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Released {releaseProgress.released.toFixed(1)} /{" "}
                  {releaseProgress.reserved.toFixed(1)} overall
                </Badge>
                {Array.from(releaseProgress.byCategory.entries()).map(([cat, prog]) => (
                  <Badge key={cat} variant="outline">
                    {cat}: {prog.released.toFixed(1)}/{prog.reserved.toFixed(1)}
                  </Badge>
                ))}
              </div>
            ) : null}
            {showRelease ? (
              <>
                <p className="text-muted-foreground">
                  Tick SKUs and quantities to hand over now. Aluminium can go to cutting while
                  accessories stay reserved for later fab/assembly — production may start after
                  any non-empty release.
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                        <TableHead className="text-right">Released</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Release qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CATEGORY_ORDER.map((key) => {
                        const rows = remainingChecklistRows.filter((r) => r.categoryKey === key);
                        if (rows.length === 0) return null;
                        const category = rows[0]?.category ?? key;
                        const allSelected = rows.every((r) => selectedItemIds.has(r.itemId));
                        return (
                          <Fragment key={`cat-${key}`}>
                            <TableRow className="bg-muted/40">
                              <TableCell>
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={(value) =>
                                    toggleCategory(category, value === true)
                                  }
                                  aria-label={`Select all ${category}`}
                                />
                              </TableCell>
                              <TableCell colSpan={6} className="font-medium">
                                {category}
                              </TableCell>
                            </TableRow>
                            {rows.map((row) => (
                              <TableRow key={row.itemId}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedItemIds.has(row.itemId)}
                                    onCheckedChange={(value) =>
                                      toggleChecklistItem(row.itemId, value === true)
                                    }
                                    aria-label={`Select ${row.sku}`}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.reserved}
                                  {row.uom ? ` ${row.uom}` : ""}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.released}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.remaining}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    className="ml-auto h-8 w-24 text-right"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={releaseQtyDrafts[row.itemId] ?? String(row.remaining)}
                                    disabled={!selectedItemIds.has(row.itemId)}
                                    onChange={(event) =>
                                      setReleaseQtyDrafts((prev) => ({
                                        ...prev,
                                        [row.itemId]: event.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="received_by">Received by</Label>
                  <WarehouseNativeSelect
                    value={receivedBy}
                    onChange={setReceivedBy}
                    placeholder="Select receiver…"
                    options={users.map((user) => ({
                      value: String(user.id),
                      label: user.name,
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="release_notes">Notes (optional)</Label>
                  <Textarea
                    id="release_notes"
                    value={releaseNotes}
                    onChange={(event) => setReleaseNotes(event.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleRelease("selected")}
                    disabled={releasing || selectedItemIds.size === 0}
                  >
                    {releasing ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <Truck className="mr-2 h-4 w-4" />
                    )}
                    Release selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRelease("all_remaining")}
                    disabled={releasing}
                  >
                    Release all remaining
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                {!canRelease
                  ? "You need warehouse.reservations.release permission."
                  : stage === "materials_released" && !hasRemainingToRelease
                    ? "All reserved materials have been released — open production cutting queue to begin."
                    : activeReservation === null
                      ? "Reserve materials first, then release to production."
                      : !fullyReserved
                        ? `Reservation incomplete (${unitsReserved}/${unitsTotal} units). Top up missing or adjust held qty below, then release.`
                        : "Release is available once materials are fully reserved to this project."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BOM availability</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aluminium profiles nest onto 6m bars. Rubber/seals reserve exact cut metres.
            {showAdjust
              ? " Use Adjust to manually set held quantity for a line (increase or decrease)."
              : ""}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto space-y-6">
          {availabilityRows.aluminium.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Aluminium profiles</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Cuts (from fab list)</TableHead>
                    <TableHead className="text-right">Bars</TableHead>
                    <TableHead className="text-right">Held / need</TableHead>
                    <TableHead className="text-right">WH avail.</TableHead>
                    <TableHead className="text-right">Offcut</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    {showAdjust ? <TableHead className="text-right">Adjust held</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilityRows.aluminium.map((row) => {
                    const uom =
                      row.reservation_uom === "metre" || row.reservation_uom === "m"
                        ? "m"
                        : row.reservation_uom;
                    const underReserved = !row.is_fully_reserved;
                    return (
                      <TableRow
                        key={row.key}
                        className={underReserved ? "bg-amber-500/5" : undefined}
                      >
                        <TableCell>
                          <div className="font-medium">{row.material_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.material_code ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                          <span className="text-foreground font-medium">
                            {row.cuts_total} pcs
                          </span>
                          <span className="block">{row.cutParts.join(" · ")}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {row.bars_needed ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={underReserved ? "text-amber-700 dark:text-amber-400" : undefined}>
                            {row.reserved_qty} / {row.reservation_target_qty} {uom}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.warehouse_available ?? "—"}
                          {row.warehouse_available != null ? ` ${uom}` : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.offcut_usable ?? "—"}
                          {row.offcut_usable != null ? " m" : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(row.shortage_qty) > 0 ? (
                            <span className="text-destructive">
                              {row.shortage_qty} {uom}
                            </span>
                          ) : (
                            `${row.shortage_qty} ${uom}`
                          )}
                        </TableCell>
                        {showAdjust ? (
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Input
                                className="h-8 w-24 text-right tabular-nums"
                                type="number"
                                min={0}
                                step="0.001"
                                value={adjustDrafts[row.key] ?? ""}
                                onChange={(event) =>
                                  setAdjustDrafts((prev) => ({
                                    ...prev,
                                    [row.key]: event.target.value,
                                  }))
                                }
                                aria-label={`Adjust held ${row.material_code ?? row.material_name}`}
                              />
                              <span className="text-xs text-muted-foreground w-4">{uom}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={adjustingKey === row.key}
                                onClick={() =>
                                  void handleAdjust({
                                    key: row.key,
                                    itemId: row.warehouse_item_id,
                                    uomLabel: uom,
                                  })
                                }
                              >
                                {adjustingKey === row.key ? (
                                  <Spinner className="h-3.5 w-3.5" />
                                ) : (
                                  "Set"
                                )}
                              </Button>
                              {underReserved ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8"
                                  disabled={adjustingKey === row.key}
                                  onClick={() =>
                                    void handleAdjust({
                                      key: row.key,
                                      itemId: row.warehouse_item_id,
                                      uomLabel: uom,
                                      quantity: row.reservation_target_qty,
                                    })
                                  }
                                >
                                  Fill need
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {availabilityRows.other.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Accessories &amp; other
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">Held / need</TableHead>
                    <TableHead className="text-right">WH avail.</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    {showAdjust ? <TableHead className="text-right">Adjust held</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilityRows.other.map((line) => {
                    const key = `other-${line.bom_line_id}`;
                    const underReserved = !line.is_fully_reserved;
                    return (
                      <TableRow
                        key={line.bom_line_id}
                        className={underReserved ? "bg-amber-500/5" : undefined}
                      >
                        <TableCell>
                          <div className="font-medium">{line.material_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {line.material_code ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.required_qty}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={underReserved ? "text-amber-700 dark:text-amber-400" : undefined}>
                            {line.reserved_qty} / {line.reservation_target_qty ?? line.required_qty}{" "}
                            pcs
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.warehouse_available ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(line.shortage_qty) > 0 ? (
                            <span className="text-destructive">{line.shortage_qty}</span>
                          ) : (
                            line.shortage_qty
                          )}
                        </TableCell>
                        {showAdjust && line.warehouse_item_id ? (
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Input
                                className="h-8 w-24 text-right tabular-nums"
                                type="number"
                                min={0}
                                step="0.001"
                                value={adjustDrafts[key] ?? ""}
                                onChange={(event) =>
                                  setAdjustDrafts((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                aria-label={`Adjust held ${line.material_code ?? line.material_name}`}
                              />
                              <span className="text-xs text-muted-foreground w-6">pcs</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={adjustingKey === key}
                                onClick={() =>
                                  void handleAdjust({
                                    key,
                                    itemId: line.warehouse_item_id!,
                                    bomLineRef: String(line.bom_line_id),
                                    uomLabel: "pcs",
                                  })
                                }
                              >
                                {adjustingKey === key ? (
                                  <Spinner className="h-3.5 w-3.5" />
                                ) : (
                                  "Set"
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        ) : showAdjust ? (
                          <TableCell />
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {warehouseLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warehouse BOM lines.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
