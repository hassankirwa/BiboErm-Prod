"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductionOffcutItemSelect } from "@/components/production/production-offcut-item-select";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  completeProductionStage,
  logProductionOffcuts,
  skipProductionStage,
  startProductionStage,
  updateProductionOrderStatus,
  type CuttingSheetLine,
  type GlassAssemblyContext,
  type OffcutInput,
  type ProductionOrder,
} from "@/lib/api/production";
import { usePermissions } from "@/hooks/use-permissions";
import { canManageProductionStages, isProductionManager } from "@/lib/production/utils";
import { toast } from "sonner";

type Props = {
  order: ProductionOrder;
  cuttingSheetLines?: CuttingSheetLine[];
  onUpdated: () => void;
};

type OffcutRow = {
  item_id: string;
  length_mm: string;
  quantity_pieces: string;
};

function emptyOffcutRow(): OffcutRow {
  return { item_id: "", length_mm: "", quantity_pieces: "1" };
}

function rowsToOffcuts(rows: OffcutRow[]): OffcutInput[] | null {
  const parsed: OffcutInput[] = [];
  for (const row of rows) {
    const itemId = Number(row.item_id);
    const lengthMm = Number(row.length_mm);
    if (!itemId || !lengthMm || lengthMm < 1) continue;
    parsed.push({
      item_id: itemId,
      length_mm: lengthMm,
      quantity_pieces: Number(row.quantity_pieces) || 1,
      storage_area: "production_workspace",
    });
  }
  return parsed.length > 0 ? parsed : null;
}

function OffcutRowsForm({
  rows,
  cuttingSheetLines,
  onChange,
}: {
  rows: OffcutRow[];
  cuttingSheetLines: CuttingSheetLine[];
  onChange: (rows: OffcutRow[]) => void;
}) {
  const hasSheet = cuttingSheetLines.length > 0;

  return (
    <div className="space-y-2">
      {!hasSheet && (
        <p className="text-xs text-muted-foreground">
          No cutting sheet yet — select an aluminium profile from master data, or regenerate
          the sheet from BOM first.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Profile / item</Label>
            <ProductionOffcutItemSelect
              cuttingSheetLines={cuttingSheetLines}
              value={row.item_id}
              onValueChange={(v) => {
                const next = [...rows];
                next[index] = { ...next[index], item_id: v };
                onChange(next);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Length (mm)</Label>
            <Input
              type="number"
              min={1}
              value={row.length_mm}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...next[index], length_mm: e.target.value };
                onChange(next);
              }}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, emptyOffcutRow()])}
      >
        Add another offcut
      </Button>
    </div>
  );
}

export function ProductionOrderActions({
  order,
  cuttingSheetLines = [],
  onUpdated,
}: Props) {
  const { can } = usePermissions();
  const { user } = useAuth();
  const canManageStages = canManageProductionStages(can, user?.id, order);
  const isManager = isProductionManager(can);

  const [open, setOpen] = useState<"start" | "complete" | "offcuts" | "skip" | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [offcutRows, setOffcutRows] = useState<OffcutRow[]>([emptyOffcutRow()]);

  if (!canManageStages || order.status === "completed") {
    return null;
  }

  const stage = order.current_stage;
  const onHold = order.status === "on_hold";

  const hasStarted = order.stage_logs?.some(
    (l) => l.stage === stage && l.status === "started" && !l.completed_at,
  );

  const glassAssembly: GlassAssemblyContext | undefined = order.glass_assembly;
  const isGlassAssemblyStage = stage === "glass_assembly";
  const showStartStage =
    !hasStarted &&
    (!isGlassAssemblyStage || glassAssembly?.can_start === true);
  const showSkipGlassAssembly =
    isGlassAssemblyStage &&
    !hasStarted &&
    glassAssembly?.can_skip === true;
  const glassAssemblyBlocked =
    isGlassAssemblyStage &&
    !hasStarted &&
    glassAssembly?.requires_glass === true &&
    glassAssembly?.can_start !== true;

  async function handleSkipGlassAssembly() {
    setLoading(true);
    try {
      await skipProductionStage(order.id, {
        stage: "glass_assembly",
        notes: notes || undefined,
      });
      toast.success("Skipped glass assembly — no glass on this project");
      setOpen(null);
      setNotes("");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to skip glass assembly"));
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setLoading(true);
    try {
      await startProductionStage(order.id, { stage, notes: notes || undefined });
      toast.success(`Started ${stage}`);
      setOpen(null);
      setNotes("");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to start stage"));
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(offcuts?: OffcutInput[]) {
    setLoading(true);
    try {
      await completeProductionStage(order.id, {
        stage,
        notes: notes || undefined,
        offcuts,
      });
      toast.success(`Completed ${stage}`);
      setOpen(null);
      setNotes("");
      setOffcutRows([emptyOffcutRow()]);
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to complete stage"));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogOffcuts() {
    const offcuts = rowsToOffcuts(offcutRows);
    if (!offcuts) {
      toast.error("Select a profile and enter length (mm)");
      return;
    }
    setLoading(true);
    try {
      await logProductionOffcuts(order.id, offcuts);
      toast.success("Offcuts logged");
      setOpen(null);
      setOffcutRows([emptyOffcutRow()]);
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to log offcuts"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleHold() {
    setLoading(true);
    try {
      await updateProductionOrderStatus(order.id, {
        status: onHold ? "in_progress" : "on_hold",
      });
      toast.success(onHold ? "Order resumed" : "Order placed on hold");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isManager && (
        <Button size="sm" variant="outline" onClick={toggleHold} disabled={loading}>
          {onHold ? "Resume order" : "Put on hold"}
        </Button>
      )}
      {onHold ? (
        <p className="w-full text-xs text-muted-foreground">
          Order is on hold. Resume before starting or completing stages.
        </p>
      ) : (
        <>
          {showStartStage && (
            <Button size="sm" variant="outline" onClick={() => setOpen("start")}>
              Start stage
            </Button>
          )}
          {showSkipGlassAssembly && (
            <Button size="sm" variant="secondary" onClick={() => setOpen("skip")}>
              Skip glass assembly
            </Button>
          )}
          {glassAssemblyBlocked && (
            <p className="w-full text-xs text-muted-foreground">
              Glass must be delivered before starting assembly.
              {glassAssembly?.glass_order_status
                ? ` Current status: ${glassAssembly.glass_order_status.replace(/_/g, " ")}.`
                : " No glass order on file yet."}
            </p>
          )}
          {showSkipGlassAssembly && (
            <p className="w-full text-xs text-muted-foreground">
              This project has no glass in the BOM — skip to advance to finishing.
            </p>
          )}
          {hasStarted && (
            <Button size="sm" onClick={() => setOpen("complete")}>
              Complete stage
            </Button>
          )}
          {stage === "cutting" && hasStarted && (
            <Button size="sm" variant="secondary" onClick={() => setOpen("offcuts")}>
              Log offcuts
            </Button>
          )}
        </>
      )}

      <Dialog open={open === "start"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start {stage}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleStart} disabled={loading}>
              Confirm start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "complete"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete {stage}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {stage === "cutting" && (
              <p className="text-xs text-muted-foreground">
                Reusable offcuts are optional. Use &quot;Log offcuts&quot; if you have
                pieces to record; otherwise complete cutting with no offcuts.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => handleComplete()} disabled={loading}>
              Confirm complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "skip"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip glass assembly</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            No glass is required for this project. The order will advance directly to
            finishing without running glass assembly.
          </p>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleSkipGlassAssembly} disabled={loading}>
              Confirm skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "offcuts"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log offcuts (production workspace)</DialogTitle>
          </DialogHeader>
          <OffcutRowsForm
            rows={offcutRows}
            cuttingSheetLines={cuttingSheetLines}
            onChange={setOffcutRows}
          />
          <DialogFooter>
            <Button onClick={handleLogOffcuts} disabled={loading}>
              Log offcut(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
