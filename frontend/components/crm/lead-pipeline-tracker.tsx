"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKanbanStageLabel,
  getPipelineStageLabel,
  PIPELINE_TRACKER_STAGES,
  pipelineTrackerProgressIndex,
  resolveLeadPipelineStage,
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

export function LeadPipelineTracker({
  pipelineStage,
  status,
  updatedAt,
  className,
}: LeadPipelineTrackerProps) {
  const pipeline = resolveLeadPipelineStage({
    pipeline_stage: pipelineStage,
    status,
  });
  const currentIndex = pipelineTrackerProgressIndex({
    pipeline_stage: pipelineStage,
    status,
  });
  const allComplete = currentIndex >= PIPELINE_TRACKER_STAGES.length;
  const sla = getSlaBadge(pipelineStage ?? pipeline, updatedAt);

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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {getPipelineStageLabel(pipeline)}
          </Badge>
          {sla ? (
            <Badge variant="outline" className={cn("text-[10px]", sla.className)}>
              {sla.label}
            </Badge>
          ) : null}
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {PIPELINE_TRACKER_STAGES.map((stageId: LeadKanbanStageId, index) => {
          const done = allComplete || currentIndex > index;
          const active = !allComplete && currentIndex === index;

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
