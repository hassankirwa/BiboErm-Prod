"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  completeProductionStage,
  skipProductionStage,
  startProductionStage,
  updateProductionOrderStatus,
  type CuttingSheetLine,
  type GlassAssemblyContext,
  type ProductionOrder,
} from "@/lib/api/production";
import { usePermissions } from "@/hooks/use-permissions";
import { canManageProductionStages, isProductionManager } from "@/lib/production/utils";
import { toast } from "sonner";

/** Remnants shorter than this are usually not reusable — default to Discard. */
const MIN_USABLE_OFFCUT_MM = 100;

type OffcutDecision = "keep" | "discard";

type Props = {
  order: ProductionOrder;
  cuttingSheetLines?: CuttingSheetLine[];
  onUpdated: () => void;
};

function isCuttingSheetReady(lines: CuttingSheetLine[]): boolean {
  if (lines.length === 0) return false;
  return lines.every((line) => {
    if (line.bar_length_mm == null || line.waste_mm == null) return false;
    const usedMm = line.planned_used_mm ?? line.needed_mm;
    if (usedMm > line.bar_length_mm) return false;
    if (usedMm + line.waste_mm > line.bar_length_mm) return false;
    return true;
  });
}

function cuttingSheetBlockReason(lines: CuttingSheetLine[]): string | null {
  if (lines.length === 0) {
    return "Generate a cutting sheet before completing cutting.";
  }
  const oversize = lines.find(
    (line) =>
      line.bar_length_mm != null &&
      ((line.planned_used_mm ?? line.needed_mm) > line.bar_length_mm ||
        (line.waste_mm != null &&
          (line.planned_used_mm ?? line.needed_mm) + line.waste_mm >
            line.bar_length_mm)),
  );
  if (oversize) {
    return "Cut length and waste must fit within the logged bar length on every line.";
  }
  if (!isCuttingSheetReady(lines)) {
    return "Fill bar length and waste on every cutting sheet line before completing.";
  }
  return null;
}

function cuttingSheetWasteOffcuts(lines: CuttingSheetLine[]) {
  return lines
    .filter(
      (line) =>
        line.bar_length_mm != null &&
        line.waste_mm != null &&
        line.waste_mm > 0 &&
        (line.planned_used_mm ?? line.needed_mm) + line.waste_mm <=
          line.bar_length_mm,
    )
    .slice()
    .sort((a, b) => {
      const code = a.profile_code.localeCompare(b.profile_code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return code !== 0 ? code : (a.bar_number ?? 1) - (b.bar_number ?? 1);
    });
}

function defaultDecision(wasteMm: number): OffcutDecision {
  return wasteMm < MIN_USABLE_OFFCUT_MM ? "discard" : "keep";
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

  const [open, setOpen] = useState<"start" | "complete" | "skip" | null>(null);
  const [notes, setNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [offcutDecisions, setOffcutDecisions] = useState<
    Record<number, OffcutDecision>
  >({});

  const stage = order.current_stage;
  const isCutting = stage === "cutting";
  const isFabricationClose = stage === "fabrication" || stage === "sash";
  const notesRequired = stage === "material_prep" || isFabricationClose;
  const showEvidenceUpload = stage === "material_prep" || isFabricationClose;
  const wasteOffcuts = useMemo(
    () => (isCutting ? cuttingSheetWasteOffcuts(cuttingSheetLines) : []),
    [cuttingSheetLines, isCutting],
  );

  useEffect(() => {
    setOffcutDecisions((prev) => {
      const next: Record<number, OffcutDecision> = {};
      for (const line of wasteOffcuts) {
        next[line.id] = prev[line.id] ?? defaultDecision(line.waste_mm ?? 0);
      }
      return next;
    });
  }, [wasteOffcuts]);

  const profileGroupIndexes = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const line of wasteOffcuts) {
      const key = line.profile_code.trim().toUpperCase();
      if (!map.has(key)) map.set(key, index++);
    }
    return map;
  }, [wasteOffcuts]);

  if (!canManageStages || order.status === "completed") {
    return null;
  }

  const onHold = order.status === "on_hold";
  const isMaterialPrep = stage === "material_prep";
  const cuttingBlockReason = isCutting
    ? cuttingSheetBlockReason(cuttingSheetLines)
    : null;
  const savedLines = isCutting
    ? cuttingSheetLines.filter(
        (line) => line.bar_length_mm != null && line.waste_mm != null,
      ).length
    : 0;
  const keepCount = wasteOffcuts.filter(
    (line) =>
      (offcutDecisions[line.id] ?? defaultDecision(line.waste_mm ?? 0)) ===
      "keep",
  ).length;
  const discardCount = wasteOffcuts.length - keepCount;
  const hasStageAssignee =
    order.teams?.some((team) => team.stage === stage) ?? false;

  const hasStarted = order.stage_logs?.some(
    (l) => l.stage === stage && l.status === "started" && !l.completed_at,
  );

  const glassAssembly: GlassAssemblyContext | undefined = order.glass_assembly;
  const isGlassAssemblyStage = stage === "glass_assembly";
  const isQcPreCheckStage = stage === "qc_pre_check";
  const showStartStage =
    !hasStarted &&
    (!isGlassAssemblyStage || glassAssembly?.can_start === true);
  const showSkipGlassAssembly =
    isGlassAssemblyStage &&
    !hasStarted &&
    glassAssembly?.can_skip === true;
  const showSkipQcPreCheck = isQcPreCheckStage && !hasStarted;
  const glassAssemblyBlocked =
    isGlassAssemblyStage &&
    !hasStarted &&
    glassAssembly?.requires_glass === true &&
    glassAssembly?.can_start !== true;

  function setDecision(lineId: number, decision: OffcutDecision) {
    setOffcutDecisions((prev) => ({ ...prev, [lineId]: decision }));
  }

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

  async function handleSkipQcPreCheck() {
    setLoading(true);
    try {
      await skipProductionStage(order.id, {
        stage: "qc_pre_check",
        notes: notes.trim() || "Skipped — formal QC after assembly",
      });
      toast.success("Skipped QC pre-check — inspect after assembly");
      setOpen(null);
      setNotes("");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to skip QC pre-check"));
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

  async function handleComplete() {
    if (isMaterialPrep) {
      if (!hasStageAssignee) {
        toast.error("Assign a team member to material preparation before completing");
        return;
      }
    }
    if (notesRequired && !notes.trim()) {
      toast.error("Add notes before closing this stage");
      return;
    }
    if (isCutting && cuttingBlockReason) {
      toast.error(cuttingBlockReason);
      return;
    }

    const discardWasteLineIds = wasteOffcuts
      .filter(
        (line) =>
          (offcutDecisions[line.id] ?? defaultDecision(line.waste_mm ?? 0)) ===
          "discard",
      )
      .map((line) => line.id);

    setLoading(true);
    try {
      await completeProductionStage(order.id, {
        stage,
        notes: notes.trim() || undefined,
        evidence: evidenceFiles,
        discard_waste_line_ids: discardWasteLineIds,
      });
      toast.success(
        isCutting
          ? `Completed cutting · kept ${keepCount} offcut(s), discarded ${discardCount}`
          : `Completed ${stage}`,
      );
      setOpen(null);
      setNotes("");
      setEvidenceFiles([]);
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to complete stage"));
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
          {showSkipQcPreCheck && (
            <Button size="sm" variant="secondary" onClick={() => setOpen("skip")}>
              Skip QC pre-check
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
          {showSkipQcPreCheck && (
            <p className="w-full text-xs text-muted-foreground">
              Early QC is optional — formal inspection usually happens after assembly.
            </p>
          )}
          {hasStarted && (
            <Button
              size="sm"
              onClick={() => setOpen("complete")}
              disabled={
                (isMaterialPrep && !hasStageAssignee) ||
                (isCutting && Boolean(cuttingBlockReason))
              }
            >
              Complete stage
            </Button>
          )}
          {isMaterialPrep && hasStarted && !hasStageAssignee && (
            <p className="w-full text-xs text-muted-foreground">
              Assign a team member to material preparation before completing this stage.
            </p>
          )}
          {isCutting && hasStarted && cuttingBlockReason && (
            <p className="w-full text-xs text-muted-foreground">{cuttingBlockReason}</p>
          )}
          {isCutting && hasStarted && cuttingSheetLines.length > 0 && (
            <div className="w-full space-y-2 text-xs text-muted-foreground">
              <p>
                Sheet: {savedLines}/{cuttingSheetLines.length} lines saved
                {wasteOffcuts.length > 0
                  ? ` · keep ${keepCount} / discard ${discardCount} offcut(s) on complete`
                  : ""}
              </p>
              {wasteOffcuts.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[36rem] text-left text-sm text-foreground">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Code</th>
                        <th className="px-3 py-2 font-medium">Bar</th>
                        <th className="px-3 py-2 font-medium">Used (mm)</th>
                        <th className="px-3 py-2 font-medium">Waste (mm)</th>
                        <th className="px-3 py-2 font-medium">Decision</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wasteOffcuts.map((line) => {
                        const decision =
                          offcutDecisions[line.id] ??
                          defaultDecision(line.waste_mm ?? 0);
                        const groupIndex =
                          profileGroupIndexes.get(
                            line.profile_code.trim().toUpperCase(),
                          ) ?? 0;
                        const rowClass =
                          groupIndex % 2 === 0
                            ? "bg-orange-50/60 dark:bg-orange-950/15"
                            : "bg-background";
                        const shortScrap =
                          (line.waste_mm ?? 0) < MIN_USABLE_OFFCUT_MM;

                        return (
                          <tr
                            key={line.id}
                            className={`border-b border-border last:border-b-0 ${rowClass}`}
                          >
                            <td className="px-3 py-2 font-medium">
                              {line.profile_code}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {line.bar_number ?? 1}
                            </td>
                            <td className="px-3 py-2">
                              {line.planned_used_mm ?? line.needed_mm}
                            </td>
                            <td className="px-3 py-2">
                              {line.waste_mm}
                              {shortScrap ? (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  (short)
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  decision === "keep"
                                    ? "text-success"
                                    : "text-muted-foreground"
                                }
                              >
                                {decision === "keep" ? "Keep" : "Discard"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    decision === "keep" ? "default" : "outline"
                                  }
                                  className="h-7 px-2"
                                  onClick={() => setDecision(line.id, "keep")}
                                >
                                  Keep
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    decision === "discard"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="h-7 px-2"
                                  onClick={() => setDecision(line.id, "discard")}
                                >
                                  Discard
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {wasteOffcuts.length > 0 && (
                <p>
                  Waste under {MIN_USABLE_OFFCUT_MM} mm defaults to Discard. Kept
                  remnants log to the production workspace on complete.
                </p>
              )}
            </div>
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

      <Dialog
        open={open === "complete"}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(null);
            setEvidenceFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete {stage}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>
                Notes{notesRequired ? " (required)" : ""}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isMaterialPrep
                    ? "Describe prep work completed, shortages, or handoff notes…"
                    : isFabricationClose
                      ? "Describe fabrication work completed, issues, or handoff notes…"
                      : undefined
                }
              />
            </div>
            {showEvidenceUpload && (
              <div className="space-y-2">
                <Label>Photos (optional, up to 8)</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []).slice(0, 8);
                    setEvidenceFiles(selected);
                  }}
                />
                {evidenceFiles.length > 0 ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {evidenceFiles.map((file) => (
                      <li key={`${file.name}-${file.size}`}>{file.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Attach photos before closing {isFabricationClose ? "fabrication" : "this stage"}.
                  </p>
                )}
              </div>
            )}
            {isCutting && (
              <p className="text-xs text-muted-foreground">
                On complete: keep {keepCount} offcut(s), discard {discardCount}. Discarded
                waste is not logged to the offcut pool.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleComplete}
              disabled={
                loading ||
                (isMaterialPrep && !hasStageAssignee) ||
                (notesRequired && !notes.trim()) ||
                (isCutting && Boolean(cuttingBlockReason))
              }
            >
              Confirm complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "skip"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isQcPreCheckStage ? "Skip QC pre-check" : "Skip glass assembly"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isQcPreCheckStage
              ? "Skip early materials QC. Formal inspection is expected after assembly (post-fabrication)."
              : "No glass is required for this project. The order will advance directly to finishing without running glass assembly."}
          </p>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              onClick={isQcPreCheckStage ? handleSkipQcPreCheck : handleSkipGlassAssembly}
              disabled={loading}
            >
              Confirm skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
