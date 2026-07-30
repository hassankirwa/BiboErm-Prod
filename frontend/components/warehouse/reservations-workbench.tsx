"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
]);

type ReservationsWorkbenchProps = {
  projectId: number;
};

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
  const [receivedBy, setReceivedBy] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
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
      toast.error(error instanceof Error ? error.message : "Failed to load workbench.");
    } finally {
      setLoading(false);
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

  const warehouseLines = useMemo(
    () => (materialStatus?.lines ?? []).filter((line) => !line.is_procurement_only),
    [materialStatus],
  );

  const availabilityRows = useMemo(() => {
    const aluminiumByItem = new Map<
      number,
      {
        key: string;
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
      }
    >();
    const other: typeof warehouseLines = [];

    for (const line of warehouseLines) {
      const isAluminium =
        line.line_type === "aluminium_profile" || line.bars_needed != null;
      if (!isAluminium || !line.warehouse_item_id) {
        other.push(line);
        continue;
      }

      const existing = aluminiumByItem.get(line.warehouse_item_id);
      const cutLabel = `${Number(line.required_qty)}×${line.measurement_mm ?? "?"}mm`;
      if (!existing) {
        aluminiumByItem.set(line.warehouse_item_id, {
          key: `alu-${line.warehouse_item_id}`,
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
        });
      } else {
        existing.cutParts.push(cutLabel);
        // SKU-level fields are identical on every line; keep first non-zero shortage.
        if (Number(existing.shortage_qty) <= 0 && Number(line.shortage_qty) > 0) {
          existing.shortage_qty = line.shortage_qty;
        }
      }
    }

    return {
      aluminium: Array.from(aluminiumByItem.values()),
      other,
    };
  }, [warehouseLines]);

  async function handleReserve() {
    setReserving(true);
    try {
      const response = await reserveProjectMaterials(projectId);
      if (!response.success) {
        toast.error(response.message ?? "Could not reserve materials.");
        return;
      }
      toast.success("Materials reserved for this project (stock held, not deducted yet).");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reserve materials.");
    } finally {
      setReserving(false);
    }
  }

  async function handleRelease() {
    if (!receivedBy) {
      toast.error("Select who received the materials.");
      return;
    }
    setReleasing(true);
    try {
      await releaseProjectMaterials(projectId, {
        received_by: Number(receivedBy),
        notes: releaseNotes.trim() || undefined,
      });
      toast.success("Materials released — stock deducted and handed to receiver.");
      setReleaseNotes("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to release materials.");
    } finally {
      setReleasing(false);
    }
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
  const showReserve =
    canReserve && RESERVE_STAGES.has(stage) && Boolean(summary.can_reserve_now);
  const showRelease =
    canRelease &&
    RELEASE_STAGES.has(stage) &&
    activeReservation !== null &&
    fullyReserved;

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
            </p>
            {showReserve ? (
              <Button size="sm" onClick={() => void handleReserve()} disabled={reserving}>
                {reserving ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Reserve materials
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
            {showRelease ? (
              <>
                <p className="text-muted-foreground">
                  Deducts reserved stock and moves the project to materials released so
                  production can start cutting → fabrication → assembly → QC.
                </p>
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
                <Button size="sm" onClick={() => void handleRelease()} disabled={releasing}>
                  {releasing ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Truck className="mr-2 h-4 w-4" />
                  )}
                  Release materials
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                {!canRelease
                  ? "You need warehouse.reservations.release permission."
                  : stage === "materials_released"
                    ? "Already released — open production cutting queue to begin."
                    : activeReservation === null
                      ? "Reserve materials first, then release to production."
                      : !fullyReserved
                        ? `Reservation incomplete (${unitsReserved}/${unitsTotal} units). Aluminium profiles count once per SKU — finish remaining accessories/hardware before release.`
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
            Aluminium is grouped by SKU: all fabrication cuts for that profile are packed onto
            6m bars. Accessories stay as piece quantities.
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilityRows.aluminium.map((row) => {
                    const uom =
                      row.reservation_uom === "metre" || row.reservation_uom === "m"
                        ? "m"
                        : row.reservation_uom;
                    return (
                      <TableRow key={row.key}>
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
                          {row.reserved_qty} / {row.reservation_target_qty} {uom}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilityRows.other.map((line) => (
                    <TableRow key={line.bom_line_id}>
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
                        {line.reserved_qty} / {line.reservation_target_qty ?? line.required_qty}{" "}
                        pcs
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
                    </TableRow>
                  ))}
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
