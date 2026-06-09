"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, User } from "lucide-react";
import { AdvanceProjectStageDialog } from "@/components/projects/advance-project-stage-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";
import {
  AUTO_PROJECT_STAGES,
  canAdvanceFromFinalDesignApproval,
  formatProjectStage,
  getManualNextStages,
  getStageWaitingMessage,
  hasSiteAssessmentOperationalData,
  type ProjectDetail,
} from "@/lib/api/projects";
import {
  projectPipelinePath,
  projectSiteAssessmentPath,
  projectTabPath,
  type ProjectViewMode,
} from "@/lib/projects/paths";
import { toast } from "sonner";

type ProjectDetailActionBarProps = {
  project: ProjectDetail;
  mode?: ProjectViewMode;
  onProjectUpdated: (project: ProjectDetail) => void;
};

const ADVANCE_PERMISSIONS = [
  "projects.advance_stage",
  "projects.advance_stage_sales",
  "projects.advance_stage_warehouse",
  "projects.advance_stage_production",
  "projects.manage",
  "projects.view_all",
];

export function ProjectDetailActionBar({
  project,
  mode = "projects",
  onProjectUpdated,
}: ProjectDetailActionBarProps) {
  const isCrmMode = mode === "crm";
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const { permissions, canAny } = usePermissions();
  const siteAssessmentHref = projectSiteAssessmentPath(project.id, mode);
  const designsHref = projectTabPath(project.id, "designs", mode);
  const bomHref = projectTabPath(project.id, "bom", mode);

  const nextStages = useMemo(
    () => getManualNextStages(project.stage, permissions),
    [project.stage, permissions],
  );

  const canAdvance = canAny(...ADVANCE_PERMISSIONS);
  const isAutoStage = AUTO_PROJECT_STAGES.has(project.stage);
  const waitingMessage = isAutoStage ? getStageWaitingMessage(project.stage) : null;

  function handleAdvanceClick() {
    if (
      project.stage === "site_assessment" &&
      !hasSiteAssessmentOperationalData(project.stage_data?.site_assessment)
    ) {
      toast.error("Complete the site assessment on the dedicated page first.", {
        action: {
          label: "Open site assessment",
          onClick: () => {
            window.location.href = siteAssessmentHref;
          },
        },
      });
      return;
    }

    if (project.stage === "final_design_approval") {
      const gate = canAdvanceFromFinalDesignApproval(project);
      if (!gate.ok) {
        if (gate.missingDesign) {
          toast.error("Upload at least one design document before advancing.", {
            action: {
              label: "Designs tab",
              onClick: () => {
                window.location.href = designsHref;
              },
            },
          });
          return;
        }
        if (gate.missingBomFinalize) {
          toast.error("Upload and finalize the BOM before advancing.", {
            action: {
              label: "BOM tab",
              onClick: () => {
                window.location.href = bomHref;
              },
            },
          });
          return;
        }
      }
    }

    setAdvanceOpen(true);
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Links</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {project.account ? (
                <Link
                  href={`/crm/accounts/${project.account.id}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {project.account.name}
                </Link>
              ) : null}
              {project.deal ? (
                <Link
                  href={`/crm/deals/${project.deal.id}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {project.deal.name ?? project.deal.reference ?? `Deal #${project.deal.id}`}
                </Link>
              ) : null}
              {project.project_manager ? (
                <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  PM: {project.project_manager.name}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No project manager assigned</p>
              )}
              {!isCrmMode ? (
                <Link
                  href={projectPipelinePath(mode)}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  View in pipeline
                </Link>
              ) : null}
            </div>
          </div>

          {!isCrmMode ? (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <p className="text-xs font-medium text-muted-foreground sm:text-right">
              Stage actions
            </p>
            {waitingMessage && canAdvance && nextStages.length === 0 ? (
              <p className="max-w-sm text-sm text-muted-foreground sm:text-right">
                {waitingMessage}
              </p>
            ) : null}
            {canAdvance && nextStages.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <p className="text-sm text-muted-foreground">
                  Next:{" "}
                  <span className="font-medium text-foreground">
                    {formatProjectStage(nextStages[0])}
                  </span>
                  {nextStages.length > 1
                    ? ` (+${nextStages.length - 1} option${nextStages.length > 2 ? "s" : ""})`
                    : null}
                </p>
                <Button size="sm" onClick={handleAdvanceClick}>
                  Advance stage
                </Button>
              </div>
            ) : null}
            {!canAdvance && waitingMessage ? (
              <p className="max-w-sm text-sm text-muted-foreground sm:text-right">
                {waitingMessage}
              </p>
            ) : null}
          </div>
          ) : null}
        </CardContent>
      </Card>

      {!isCrmMode && canAdvance && nextStages.length > 0 ? (
        <AdvanceProjectStageDialog
          project={project}
          open={advanceOpen}
          onOpenChange={setAdvanceOpen}
          onProjectUpdated={onProjectUpdated}
          nextStages={nextStages}
        />
      ) : null}
    </>
  );
}
