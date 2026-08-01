"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewInspectionDialog } from "@/components/qc/new-inspection-dialog";
import {
  listQcInspections,
  PRODUCTION_IN_PROCESS_STAGES,
  QC_CONTEXT_LABELS,
  type QcInspection,
  type QcInspectionContext,
} from "@/lib/api/qc";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const PRODUCTION_QC_CONTEXTS: QcInspectionContext[] = [
  "production_qc_pre_check",
  "production_in_process",
  "production_qc_post_fabrication",
];

const IN_PROCESS_STAGE_VALUES = new Set(
  PRODUCTION_IN_PROCESS_STAGES.map((s) => s.value),
);

function stageLabel(stage: string | null | undefined): string | null {
  if (!stage) return null;
  const inProcess = PRODUCTION_IN_PROCESS_STAGES.find((s) => s.value === stage);
  if (inProcess) return inProcess.label;
  return null;
}

/** Map production order stage → QC inspection defaults. */
export function qcDefaultsForProductionStage(currentStage?: string | null): {
  context: QcInspectionContext;
  stage?: string;
  lockContext: boolean;
} {
  if (currentStage === "qc_post_fabrication") {
    return {
      context: "production_qc_post_fabrication",
      lockContext: true,
    };
  }
  if (currentStage === "qc_pre_check") {
    // Legacy stage — prefer in-process QC rather than a dedicated pre-check.
    return { context: "production_in_process", lockContext: false };
  }
  if (currentStage && IN_PROCESS_STAGE_VALUES.has(currentStage)) {
    return {
      context: "production_in_process",
      stage: currentStage,
      lockContext: false,
    };
  }
  return { context: "production_in_process", lockContext: false };
}

type Props = {
  productionOrderId: number;
  projectId?: number;
  currentStage?: string | null;
  canViewQc: boolean;
  canInspectQc?: boolean;
};

export function ProductionQcLinks({
  productionOrderId,
  projectId,
  currentStage,
  canViewQc,
  canInspectQc = false,
}: Props) {
  const router = useRouter();
  const [inspections, setInspections] = useState<QcInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const defaults = useMemo(
    () => qcDefaultsForProductionStage(currentStage),
    [currentStage],
  );

  const load = useCallback(() => {
    if (!canViewQc || !productionOrderId) return;
    setLoading(true);
    listQcInspections({
      production_order_id: productionOrderId,
      per_page: 20,
    })
      .then((res) => {
        setInspections(
          res.data.filter((i) =>
            PRODUCTION_QC_CONTEXTS.includes(i.context as QcInspectionContext),
          ),
        );
      })
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load QC inspections")),
      )
      .finally(() => setLoading(false));
  }, [canViewQc, productionOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canViewQc) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading QC inspections…</p>;
  }

  const pending = inspections.filter((i) => i.result === "pending");
  const pendingForCurrentContext = pending.filter((i) => i.context === defaults.context);
  const isPostFabStage = currentStage === "qc_post_fabrication";

  return (
    <div className="space-y-3">
      {isPostFabStage ? (
        <p className="text-xs text-muted-foreground">
          After-assembly QC is required and cannot be skipped. Use the{" "}
          <span className="font-medium text-foreground">Post-fabrication QC</span> checklist.
        </p>
      ) : null}

      {inspections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No production QC inspections yet. Pre-cutting QC is optional; after-assembly QC is
          created when finishing completes — or start the correct inspection below.
        </p>
      ) : (
        <ul className="space-y-2">
          {inspections.map((inspection) => (
            <li key={inspection.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={`/qc/inspections/${inspection.id}`}
                className="font-medium text-primary hover:underline"
              >
                {inspection.reference}
              </Link>
              <Badge variant="outline">
                {QC_CONTEXT_LABELS[inspection.context as QcInspectionContext] ??
                  inspection.context}
                {stageLabel(inspection.stage)
                  ? ` · ${stageLabel(inspection.stage)}`
                  : ""}
              </Badge>
              <Badge variant="secondary">{inspection.result}</Badge>
              {inspection.template?.name ? (
                <span className="text-xs text-muted-foreground">{inspection.template.name}</span>
              ) : null}
              {inspection.result === "pending" && (
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href={`/qc/inspections/${inspection.id}`}>Continue</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canInspectQc && (
        <div className="flex flex-wrap gap-2 pt-1">
          {pendingForCurrentContext.length === 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              {isPostFabStage
                ? inspections.some((i) => i.context === "production_qc_post_fabrication")
                  ? "Reopen after-assembly QC"
                  : "Start after-assembly QC"
                : "Start QC inspection"}
            </Button>
          )}
          {pendingForCurrentContext.length > 0 && isPostFabStage ? (
            <Button size="sm" asChild>
              <Link href={`/qc/inspections/${pendingForCurrentContext[0].id}`}>
                Continue after-assembly QC
              </Link>
            </Button>
          ) : null}
        </div>
      )}

      {canInspectQc && (
        <NewInspectionDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          defaultContext={defaults.context}
          defaultStage={defaults.stage}
          lockContext={defaults.lockContext}
          allowedContexts={
            isPostFabStage
              ? ["production_qc_post_fabrication"]
              : [
                  "production_qc_pre_check",
                  "production_in_process",
                  "production_qc_post_fabrication",
                ]
          }
          defaultProjectId={projectId}
          defaultProductionOrderId={productionOrderId}
          onCreated={(id) => {
            load();
            setNewOpen(false);
            router.push(`/qc/inspections/${id}`);
          }}
        />
      )}
    </div>
  );
}
