"use client";

import Link from "next/link";
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
  formatProjectStage,
  hasSiteAssessmentOperationalData,
  projectHasBomFinalized,
  projectHasDesignDocument,
  type ProjectDetail,
  type ProjectStageDepositConfirmation,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type AdvanceProjectStageDialogProps = {
  project: ProjectDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (project: ProjectDetail) => void;
  nextStages?: string[];
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
}: AdvanceProjectStageDialogProps) {
  const nextStages = nextStagesProp ?? PM_MANUAL_NEXT_STAGES[project.stage] ?? [];
  const [selectedStage, setSelectedStage] = useState("");
  const [depositConfirmation, setDepositConfirmation] = useState(EMPTY_DEPOSIT);
  const [advancing, setAdvancing] = useState(false);

  const siteAssessmentComplete = hasSiteAssessmentOperationalData(
    project.stage_data?.site_assessment,
  );

  const designsHref = `/projects/${project.id}?tab=designs`;
  const bomHref = `/projects/${project.id}?tab=bom`;

  useEffect(() => {
    if (!open) {
      setDepositConfirmation(EMPTY_DEPOSIT);
      setSelectedStage(nextStages[0] ?? "");
      return;
    }

    setSelectedStage(nextStages[0] ?? "");
  }, [open, project.stage, nextStages]);

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
  const hasBomFinalized = projectHasBomFinalized(project);

  const siteAssessmentHref = `/projects/${project.id}/site-assessment`;

  const dialogTitle = useMemo(() => {
    if (requiresDepositConfirmation) {
      return "Confirm deposit received";
    }
    if (requiresSiteAssessmentComplete && !siteAssessmentComplete) {
      return "Site assessment incomplete";
    }
    if (requiresFinalDesignGates && !finalDesignGate.ok) {
      return "Design & BOM requirements";
    }
    if (selectedStage) {
      return `Advance to ${formatProjectStage(selectedStage)}`;
    }
    return "Advance project stage";
  }, [
    requiresDepositConfirmation,
    requiresSiteAssessmentComplete,
    siteAssessmentComplete,
    requiresFinalDesignGates,
    finalDesignGate.ok,
    selectedStage,
  ]);

  async function handleSubmit() {
    if (!selectedStage) return;

    if (requiresSiteAssessmentComplete && !siteAssessmentComplete) {
      toast.error("Complete the site assessment on the dedicated page first.");
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

      const response = await advanceProjectStage(project.id, payload);
      onProjectUpdated(response.data);
      toast.success(`Stage updated to ${formatProjectStage(selectedStage)}.`);
      onOpenChange(false);
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
          ) : requiresSiteAssessmentComplete && !siteAssessmentComplete ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">
                Operational site assessment data must be saved before advancing to
                final design approval. Record opening counts, measurements, notes, or
                photos on the dedicated site assessment page.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href={siteAssessmentHref}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open site assessment
                </Link>
              </Button>
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
                  Site assessment is complete. Advance this project to{" "}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={advancing}>
            Cancel
          </Button>
          {requiresSiteAssessmentComplete && !siteAssessmentComplete ? (
            <Button asChild>
              <Link href={siteAssessmentHref}>Open site assessment</Link>
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
                (requiresDepositConfirmation && !depositConfirmation.notes.trim()) ||
                (requiresFinalDesignGates && !finalDesignGate.ok)
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
