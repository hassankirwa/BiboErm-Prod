"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import {
  reserveProjectMaterials,
  type ProjectDetail,
  type ProjectMaterialStatus,
} from "@/lib/api/projects";
import { toast } from "sonner";

type ProjectMaterialReserveActionProps = {
  project: ProjectDetail;
  materialStatus: ProjectMaterialStatus;
  onReserved?: () => void;
};

export function ProjectMaterialReserveAction({
  project,
  materialStatus,
  onReserved,
}: ProjectMaterialReserveActionProps) {
  const [submitting, setSubmitting] = useState(false);
  const { canAny } = usePermissions();

  const canReserve = canAny(
    "warehouse.reservations.create",
    "projects.manage",
    "projects.view_all",
    "*",
  );

  if (!canReserve || project.stage !== "material_check") {
    return null;
  }

  const summary = materialStatus.summary;
  const checkPassed =
    project.stage_data?.material_check?.can_fully_reserve === true ||
    (summary.shortage_lines === 0 &&
      summary.warehouse_lines > 0 &&
      summary.fully_reserved < summary.warehouse_lines);

  if (!checkPassed) {
    return null;
  }

  async function handleReserve() {
    setSubmitting(true);

    try {
      const response = await reserveProjectMaterials(project.id);
      if (!response.success) {
        toast.error(response.message ?? "Could not reserve materials.");
        return;
      }

      toast.success("Materials reserved and stock deducted.");
      onReserved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reserve materials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="font-medium">Warehouse action required</p>
        <p className="text-muted-foreground">
          Stock check passed. Reserve materials to deduct inventory and move this project to
          materials reserved.
        </p>
      </div>
      <Button size="sm" onClick={() => void handleReserve()} disabled={submitting}>
        {submitting ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <Package className="mr-2 h-4 w-4" />
        )}
        Reserve materials
      </Button>
    </div>
  );
}
