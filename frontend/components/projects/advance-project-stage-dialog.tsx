"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PM_MANUAL_NEXT_STAGES,
  advanceProjectStage,
  canAdvanceFromFinalDesignApproval,
  canAdvanceToFinalDesignApproval,
  canAdvanceToMaterialsReady,
  formatProjectStage,
  getProjectMaterialStatus,
  projectHasBomFinalized,
  projectHasBomUploaded,
  projectHasDesignDocument,
  type ProjectDetail,
  type ProjectMaterialStatus,
  type ProjectStageDepositConfirmation,
} from "@/lib/api/projects";
import { listDrivers, type Driver } from "@/lib/api/procurement";
import { ApiError } from "@/lib/api/errors";
import {
  projectSiteAssessmentPath,
  projectTabPath,
  type ProjectViewMode,
} from "@/lib/projects/paths";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type AdvanceProjectStageDialogProps = {
  project: ProjectDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (project: ProjectDetail) => void;
  nextStages?: string[];
  mode?: ProjectViewMode;
};

const EMPTY_DEPOSIT: ProjectStageDepositConfirmation = {
  notes: "",
  confirmed_at: "",
};

export function AdvanceProjectStageDialog({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
  nextStages: nextStagesProp,
  mode = "projects",
}: AdvanceProjectStageDialogProps) {
  const router = useRouter();
  const nextStages = nextStagesProp ?? PM_MANUAL_NEXT_STAGES[project.stage] ?? [];
  const [selectedStage, setSelectedStage] = useState("");
  const [depositConfirmation, setDepositConfirmation] = useState(EMPTY_DEPOSIT);
  const [advancing, setAdvancing] = useState(false);
  const [materialStatus, setMaterialStatus] = useState<ProjectMaterialStatus | null>(null);
  const [loadingMaterialStatus, setLoadingMaterialStatus] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const toFinalDesignGate = canAdvanceToFinalDesignApproval(project);

  const designsHref = projectTabPath(project.id, "designs", mode);
  const bomHref = projectTabPath(project.id, "bom", mode);

  useEffect(() => {
    if (!open) {
      setDepositConfirmation(EMPTY_DEPOSIT);
      setSelectedStage(nextStages[0] ?? "");
      setMaterialStatus(null);
      setSelectedDriverId("");
      setDrivers([]);
      return;
    }

    setSelectedStage(nextStages[0] ?? "");
    setSelectedDriverId("");
  }, [open, project.stage, nextStages]);

  const requiresMaterialsReadyGate = useMemo(
    () => selectedStage === "materials_ready",
    [selectedStage],
  );

  const requiresDriver = useMemo(
    () => selectedStage === "in_transit",
    [selectedStage],
  );

  useEffect(() => {
    if (!open || !requiresDriver) {
      return;
    }

    let cancelled = false;
    setLoadingDrivers(true);
    void listDrivers({ available_only: true, per_page: 100 })
      .then((response) => {
        if (!cancelled) setDrivers(response.data);
      })
      .catch(() => {
        if (!cancelled) setDrivers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDrivers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, requiresDriver]);

  useEffect(() => {
    if (!open || !requiresMaterialsReadyGate) {
      return;
    }

    let cancelled = false;
    setLoadingMaterialStatus(true);
    void getProjectMaterialStatus(project.id)
      .then((response) => {
        if (!cancelled) setMaterialStatus(response.data);
      })
      .catch(() => {
        if (!cancelled) setMaterialStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingMaterialStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, requiresMaterialsReadyGate, project.id]);

  const materialsReadyGate = canAdvanceToMaterialsReady(materialStatus?.summary);

  const requiresDepositConfirmation = useMemo(
    () =>
      project.stage === "awaiting_deposit" && selectedStage === "deposit_received",
    [project.stage, selectedStage],
  );

  const requiresSiteAssessmentComplete = useMemo(
    () =>
      project.stage === "site_assessment" &&
      selectedStage === "final_design_approval",
    [project.stage, selectedStage],
  );

  const requiresFinalDesignGates = useMemo(
    () =>
      project.stage === "final_design_approval" && selectedStage === "bom_finalized",
    [project.stage, selectedStage],
  );

  const finalDesignGate = canAdvanceFromFinalDesignApproval(project);
  const hasDesign = projectHasDesignDocument(project);
  const hasBomUploaded = projectHasBomUploaded(project);
  const hasBomFinalized = projectHasBomFinalized(project);

  const siteAssessmentHref = projectSiteAssessmentPath(project.id, mode);

  const dialogTitle = useMemo(() => {
    if (requiresDepositConfirmation) {
      return "Confirm deposit received";
    }
    if (requiresSiteAssessmentComplete && !toFinalDesignGate.ok) {
      return "Final design approval requirements";
    }
    if (requiresFinalDesignGates && !finalDesignGate.ok) {
      return "Design & BOM requirements";
    }
    if (requiresMaterialsReadyGate && !materialsReadyGate.ok) {
      return "Materials ready requirements";
    }
    if (selectedStage) {
      return `Advance to ${formatProjectStage(selectedStage)}`;
    }
    return "Advance project stage";
  }, [
    requiresDepositConfirmation,
    requiresSiteAssessmentComplete,
    toFinalDesignGate.ok,
    requiresFinalDesignGates,
    finalDesignGate.ok,
    requiresMaterialsReadyGate,
    materialsReadyGate.ok,
    selectedStage,
  ]);

  async function handleSubmit() {
    if (!selectedStage) return;

    if (requiresSiteAssessmentComplete && !toFinalDesignGate.ok) {
      if (toFinalDesignGate.missingMeasurement) {
        toast.error("Complete the site assessment on the dedicated page first.");
      } else if (toFinalDesignGate.missingDesign) {
        toast.error("Upload at least one design document first.", {
          action: { label: "Designs tab", onClick: () => { window.location.href = designsHref; } },
        });
      } else if (toFinalDesignGate.missingBomUpload) {
        toast.error("Upload a BOM first.", {
          action: { label: "BOM tab", onClick: () => { window.location.href = bomHref; } },
        });
      }
      return;
    }

    if (requiresFinalDesignGates && !finalDesignGate.ok) {
      if (finalDesignGate.missingDesign) {
        toast.error("Upload at least one design document first.", {
          action: { label: "Designs tab", onClick: () => { window.location.href = designsHref; } },
        });
      } else if (finalDesignGate.missingBomFinalize) {
        toast.error("Upload and finalize the BOM first.", {
          action: { label: "BOM tab", onClick: () => { window.location.href = bomHref; } },
        });
      }
      return;
    }

    if (requiresMaterialsReadyGate && !materialsReadyGate.ok) {
      toast.error(
        materialsReadyGate.reason ??
          "Resolve material shortages and finish procurement before marking materials ready.",
      );
      return;
    }

    if (requiresDriver && !selectedDriverId) {
      toast.error("Select an available driver before advancing to in transit.");
      return;
    }

    setAdvancing(true);
    try {
      const payload: Parameters<typeof advanceProjectStage>[1] = {
        stage: selectedStage,
      };

      if (requiresDepositConfirmation) {
        payload.deposit_confirmation = {
          notes: depositConfirmation.notes.trim(),
          confirmed_at: depositConfirmation.confirmed_at?.trim() || undefined,
        };
      }

      if (requiresDriver) {
        payload.driver_id = Number(selectedDriverId);
      }

      const response = await advanceProjectStage(project.id, payload);
      onProjectUpdated(response.data);
      toast.success(`Stage updated to ${formatProjectStage(selectedStage)}.`);
      onOpenChange(false);

      if (selectedStage === "site_assessment") {
        router.push(projectSiteAssessmentPath(project.id, mode));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to advance stage.");
    } finally {
      setAdvancing(false);
    }
  }

  if (nextStages.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {nextStages.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="advance-stage">Next stage</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger id="advance-stage">
                  <SelectValue placeholder="Select next stage" />
                </SelectTrigger>
                <SelectContent>
                  {nextStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {formatProjectStage(stage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : requiresSiteAssessmentComplete && !toFinalDesignGate.ok ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">
                Before advancing to final design approval, complete the following:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  {!toFinalDesignGate.missingMeasurement ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  Production measurement complete
                </li>
                <li className="flex items-center gap-2">
                  {hasDesign ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  Design document uploaded
                </li>
                <li className="flex items-center gap-2">
                  {hasBomUploaded ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  BOM uploaded
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                {toFinalDesignGate.missingMeasurement ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={siteAssessmentHref}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open site assessment
                    </Link>
                  </Button>
                ) : null}
                {!hasDesign ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={designsHref}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Upload design
                    </Link>
                  </Button>
                ) : null}
                {!hasBomUploaded ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={bomHref}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open BOM tab
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : requiresFinalDesignGates && !finalDesignGate.ok ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">
                Before moving to BOM finalized, complete the following on this project:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  {hasDesign ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  Design document uploaded
                </li>
                <li className="flex items-center gap-2">
                  {hasBomFinalized ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  BOM uploaded and finalized
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                {!hasDesign ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={designsHref}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Upload design
                    </Link>
                  </Button>
                ) : null}
                {!hasBomFinalized ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={bomHref}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open BOM tab
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {requiresSiteAssessmentComplete ? (
                <>
                  Measurement, design, and BOM are ready. Advance this project to{" "}
                  <span className="font-medium text-foreground">
                    {formatProjectStage(selectedStage)}
                  </span>
                  ?
                </>
              ) : requiresFinalDesignGates ? (
                <>
                  Design documents and BOM are ready. Advance to{" "}
                  <span className="font-medium text-foreground">
                    {formatProjectStage(selectedStage)}
                  </span>
                  ? You can also use Finalize BOM on the BOM tab, which moves the project
                  automatically.
                </>
              ) : (
                <>
                  Moving project to{" "}
                  <span className="font-medium text-foreground">
                    {formatProjectStage(selectedStage)}
                  </span>
                  .
                </>
              )}
            </p>
          )}

          {requiresMaterialsReadyGate ? (
            <div
              className={
                materialsReadyGate.ok
                  ? "space-y-3 rounded-lg border border-border p-4"
                  : "space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
              }
            >
              <p className="text-sm text-muted-foreground">
                Materials ready requires every warehouse BOM line reserved to this project.
                Stock reserved for other projects does not count.
              </p>
              {loadingMaterialStatus ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking material status…
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    {!materialsReadyGate.shortageLines && !materialsReadyGate.missingBom ? (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    Warehouse lines fully reserved to this project
                  </li>
                  <li className="flex items-center gap-2">
                    {!materialsReadyGate.openRequisitions ? (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    No open procurement requisitions
                  </li>
                  <li className="flex items-center gap-2">
                    {!materialsReadyGate.glassPending ? (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    No pending glass orders
                  </li>
                </ul>
              )}
              {!loadingMaterialStatus && materialsReadyGate.reason ? (
                <p className="text-sm text-destructive">{materialsReadyGate.reason}</p>
              ) : null}
            </div>
          ) : null}

          {requiresDepositConfirmation ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Confirm deposit receipt. Use notes for payment reference or confirmation
                details — the deal record keeps the financial amount.
              </p>
              <div className="space-y-2">
                <Label htmlFor="deposit-confirmed-at">Confirmation date (optional)</Label>
                <Input
                  id="deposit-confirmed-at"
                  type="date"
                  value={depositConfirmation.confirmed_at ?? ""}
                  onChange={(event) =>
                    setDepositConfirmation((current) => ({
                      ...current,
                      confirmed_at: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-notes">Confirmation notes</Label>
                <Textarea
                  id="deposit-notes"
                  rows={4}
                  placeholder="e.g. 30% deposit received via M-Pesa ref ABC123, confirmed with client."
                  value={depositConfirmation.notes}
                  onChange={(event) =>
                    setDepositConfirmation((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {requiresDriver ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Assign an available driver to dispatch this project to site.
              </p>
              {loadingDrivers ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available drivers…
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="dispatch-driver">Driver</Label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger id="dispatch-driver">
                      <SelectValue placeholder="Select available driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={String(driver.id)}>
                          {driver.code} · {driver.name}
                          {driver.vehicle_registration
                            ? ` · ${driver.vehicle_registration}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {drivers.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No available drivers. Free a driver or add one in procurement.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={advancing}>
            Cancel
          </Button>
          {requiresSiteAssessmentComplete && !toFinalDesignGate.ok ? (
            <Button asChild>
              <Link
                href={
                  toFinalDesignGate.missingMeasurement
                    ? siteAssessmentHref
                    : toFinalDesignGate.missingDesign
                      ? designsHref
                      : bomHref
                }
              >
                {toFinalDesignGate.missingMeasurement
                  ? "Open site assessment"
                  : toFinalDesignGate.missingDesign
                    ? "Upload design"
                    : "Open BOM tab"}
              </Link>
            </Button>
          ) : requiresFinalDesignGates && !finalDesignGate.ok ? (
            <Button variant="outline" asChild>
              <Link href={finalDesignGate.missingDesign ? designsHref : bomHref}>
                {finalDesignGate.missingDesign ? "Upload design" : "Open BOM tab"}
              </Link>
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                advancing ||
                !selectedStage ||
                loadingMaterialStatus ||
                loadingDrivers ||
                (requiresDepositConfirmation && !depositConfirmation.notes.trim()) ||
                (requiresSiteAssessmentComplete && !toFinalDesignGate.ok) ||
                (requiresFinalDesignGates && !finalDesignGate.ok) ||
                (requiresMaterialsReadyGate && !materialsReadyGate.ok) ||
                (requiresDriver && !selectedDriverId)
              }
            >
              {advancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Advance stage
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
