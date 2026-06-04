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
import {
  completeProductionStage,
  logProductionOffcuts,
  startProductionStage,
  type OffcutInput,
  type ProductionOrder,
  type ProductionStageValue,
} from "@/lib/api/production";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

type Props = {
  order: ProductionOrder;
  onUpdated: () => void;
};

export function ProductionOrderActions({ order, onUpdated }: Props) {
  const { can } = usePermissions();
  const canManage = can("production.manage");
  const [open, setOpen] = useState<"start" | "complete" | "offcuts" | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [offcutItemId, setOffcutItemId] = useState("");
  const [offcutLength, setOffcutLength] = useState("");

  if (!canManage || order.status === "completed" || order.status === "on_hold") {
    return null;
  }

  const stage = order.current_stage;

  async function handleStart() {
    setLoading(true);
    try {
      await startProductionStage(order.id, { stage, notes: notes || undefined });
      toast.success(`Started ${stage}`);
      setOpen(null);
      setNotes("");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start stage");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(withOffcuts?: OffcutInput[]) {
    setLoading(true);
    try {
      await completeProductionStage(order.id, {
        stage,
        notes: notes || undefined,
        offcuts: withOffcuts,
      });
      toast.success(`Completed ${stage}`);
      setOpen(null);
      setNotes("");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete stage");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogOffcuts() {
    const itemId = Number(offcutItemId);
    const lengthMm = Number(offcutLength);
    if (!itemId || !lengthMm) {
      toast.error("Item ID and length are required");
      return;
    }
    setLoading(true);
    try {
      await logProductionOffcuts(order.id, [
        {
          item_id: itemId,
          length_mm: lengthMm,
          storage_area: "production_workspace",
        },
      ]);
      toast.success("Offcuts logged");
      setOffcutItemId("");
      setOffcutLength("");
      setOpen(null);
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log offcuts");
    } finally {
      setLoading(false);
    }
  }

  const hasStarted = order.stage_logs?.some(
    (l) => l.stage === stage && l.status === "started" && !l.completed_at,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {!hasStarted && (
        <Button size="sm" variant="outline" onClick={() => setOpen("start")}>
          Start stage
        </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete {stage}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            {stage === "cutting" && (
              <p className="text-xs text-muted-foreground">
                Log offcuts first, or include offcut lines when completing via API.
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

      <Dialog open={open === "offcuts"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log offcuts (production workspace)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Warehouse item ID</Label>
              <Input value={offcutItemId} onChange={(e) => setOffcutItemId(e.target.value)} />
            </div>
            <div>
              <Label>Length (mm)</Label>
              <Input value={offcutLength} onChange={(e) => setOffcutLength(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleLogOffcuts} disabled={loading}>
              Log offcut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
