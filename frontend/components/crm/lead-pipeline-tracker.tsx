"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKanbanStageLabel,
  PIPELINE_TRACKER_STAGES,
  resolveLeadKanbanStage,
  type LeadKanbanStageId,
} from "@/lib/crm-lead-pipeline";
import { getSlaBadge } from "@/lib/crm/sla-badges";
import { Badge } from "@/components/ui/badge";

type LeadPipelineTrackerProps = {
  pipelineStage?: string | null;
  status?: string | null;
  updatedAt?: string | null;
  className?: string;
};

function stageIndex(stageId: LeadKanbanStageId): number {
  return PIPELINE_TRACKER_STAGES.indexOf(stageId);
}

export function LeadPipelineTracker({
  pipelineStage,
  status,
  updatedAt,
  className,
}: LeadPipelineTrackerProps) {
  const currentStage = resolveLeadKanbanStage({
    pipeline_stage: pipelineStage,
    status,
  });
  const currentIndex = stageIndex(currentStage);
  const sla = getSlaBadge(pipelineStage ?? currentStage, updatedAt);

  return (
    <div
      className={cn(
        "rounded-[10px] border border-border bg-muted/20 p-4",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pipeline stage
        </p>
        {sla ? (
          <Badge variant="outline" className={cn("text-[10px]", sla.className)}>
            {sla.label}
          </Badge>
        ) : null}
      </div>

      <ol className="flex flex-wrap gap-2">
        {PIPELINE_TRACKER_STAGES.map((stageId, index) => {
          const done = currentIndex > index;
          const active = currentIndex === index;

          return (
            <li
              key={stageId}
              className={cn(
                "flex min-w-[88px] flex-1 flex-col items-center gap-1 rounded-[10px] border px-2 py-2 text-center",
                done && "border-emerald-200 bg-emerald-50",
                active && "border-primary bg-[#ebf2ff]",
                !done && !active && "border-border/60 bg-card",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  done && "bg-emerald-600 text-white",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  active ? "text-[#1e3a5f]" : "text-muted-foreground",
                )}
              >
                {getKanbanStageLabel(stageId)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
