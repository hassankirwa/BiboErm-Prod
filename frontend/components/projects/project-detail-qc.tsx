"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewInspectionDialog } from "@/components/qc/new-inspection-dialog";
import { QCInspectionsList } from "@/components/qc/qc-inspections-list";
import { useAuth } from "@/contexts/auth-context";
import {
  listQcInspections,
  QC_CONTEXT_LABELS,
  type QcInspection,
  type QcInspectionContext,
} from "@/lib/api/qc";
import type { ProjectDetail } from "@/lib/api/projects";
import { formatProjectStage, projectLabel } from "@/lib/api/projects";
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type ProjectDetailQcProps = {
  project: ProjectDetail;
};

export function ProjectDetailQc({ project }: ProjectDetailQcProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canView = hasPermission("qc.view");
  const canInspect = hasPermission("qc.inspect");
  const [inspections, setInspections] = useState<QcInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    listQcInspections({ project_id: project.id, per_page: 100 })
      .then((res) => setInspections(res.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load QC inspections.");
        setInspections([]);
      })
      .finally(() => setLoading(false));
  }, [project.id, canView]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canView) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          You do not have permission to view quality control for this project.
        </CardContent>
      </Card>
    );
  }

  const pendingCount = inspections.filter((i) => i.result === "pending").length;
  const failedCount = inspections.filter((i) => i.result === "fail").length;

  const stageHints: { stage: string; contexts: QcInspectionContext[] }[] = [
    {
      stage: "glass_assembly",
      contexts: ["production_qc_post_fabrication"],
    },
    {
      stage: "qc_pre_installation",
      contexts: ["production_qc_post_fabrication"],
    },
    {
      stage: "installation",
      contexts: ["site_installation"],
    },
    {
      stage: "site_qc",
      contexts: ["site_installation"],
    },
    {
      stage: "snagging",
      contexts: ["snagging_signoff"],
    },
  ];

  const relevantHint = stageHints.find((h) => h.stage === project.stage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              Quality control
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {projectLabel(project)} · {formatProjectStage(project.stage)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/qc/inspections?project_id=${project.id}`}>All inspections</Link>
            </Button>
            {canInspect && (
              <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4" />
                New inspection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-semibold">{inspections.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Pending</span>
            <p className="font-semibold">{pendingCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Failed</span>
            <p className="font-semibold text-destructive">{failedCount}</p>
          </div>
        </CardContent>
      </Card>

      {relevantHint && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Stage advisory: </span>
            At {formatProjectStage(project.stage)}, typical QC contexts are{" "}
            {relevantHint.contexts
              .map((ctx) => QC_CONTEXT_LABELS[ctx])
              .join(", ")}
            . Inspections are advisory and do not block project stage changes.
          </CardContent>
        </Card>
      )}

      <QCInspectionsList inspections={inspections} loading={loading} />

      {canInspect && (
        <NewInspectionDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          defaultProjectId={project.id}
          onCreated={(id) => {
            load();
            router.push(`/qc/inspections/${id}`);
          }}
        />
      )}
    </div>
  );
}
