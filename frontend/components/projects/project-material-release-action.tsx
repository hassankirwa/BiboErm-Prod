"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import {
  releaseProjectMaterials,
  type ProjectMaterialsReleaseOffcutLine,
} from "@/lib/api/warehouse";
import type { ProjectDetail } from "@/lib/api/projects";
import { toast } from "sonner";

type ProjectMaterialReleaseActionProps = {
  project: ProjectDetail;
  onReleased?: () => void;
};

export function ProjectMaterialReleaseAction({
  project,
  onReleased,
}: ProjectMaterialReleaseActionProps) {
  const [submitting, setSubmitting] = useState(false);
  const [offcutSummary, setOffcutSummary] = useState<ProjectMaterialsReleaseOffcutLine[] | null>(
    null,
  );
  const { can } = usePermissions();

  if (!can("warehouse.reservations.release") || project.stage !== "materials_ready") {
    return null;
  }

  async function handleRelease() {
    setSubmitting(true);

    try {
      const response = await releaseProjectMaterials(project.id);
      const offcuts = response.data.offcut_lines ?? [];
      setOffcutSummary(offcuts);

      toast.success("Materials staged for production pickup.");
      onReleased?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to release materials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-md border border-success/30 bg-success/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Stage materials for production</p>
          <p className="text-muted-foreground">
            Reserved stock stays in warehouse until production fetches it per pipeline stage.
            This step confirms pickup is authorized and shows aluminium offcut availability.
          </p>
        </div>
        <Button size="sm" onClick={() => void handleRelease()} disabled={submitting}>
          {submitting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Truck className="mr-2 h-4 w-4" />
          )}
          Stage for production
        </Button>
      </div>

      {offcutSummary && offcutSummary.length > 0 ? (
        <div className="rounded-md border text-sm divide-y">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Aluminium offcut check (issued qty vs usable offcuts)
          </p>
          {offcutSummary.map((line) => (
            <div
              key={line.item_id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
            >
              <div>
                <p className="font-medium">{line.name ?? line.sku}</p>
                <p className="text-xs text-muted-foreground">{line.note}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Release {line.qty_to_release}</p>
                {Number(line.offcut_metres_available) > 0 ? (
                  <p>{line.offcut_metres_available} m offcuts usable</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
