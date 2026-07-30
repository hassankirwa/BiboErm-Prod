"use client";

import Link from "next/link";
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

const RESERVE_STAGES = new Set([
  "material_check",
  "awaiting_procurement",
  "materials_reserved",
]);

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

  if (!canReserve || !RESERVE_STAGES.has(project.stage)) {
    return null;
  }

  const summary = materialStatus.summary;
  const unitsTotal = summary.reservation_units_total ?? summary.warehouse_lines;
  const unitsReserved =
    summary.reservation_units_reserved ?? summary.fully_reserved;
  const reservationComplete =
    typeof summary.reservation_complete === "boolean"
      ? summary.reservation_complete
      : unitsTotal > 0 && unitsReserved >= unitsTotal;
  const checkPassed =
    summary.can_reserve_now === true ||
    project.stage_data?.material_check?.can_fully_reserve === true ||
    (summary.can_fully_reserve === true &&
      unitsTotal > 0 &&
      !reservationComplete);

  if (!checkPassed && summary.can_fully_reserve !== true && summary.can_reserve_now !== true) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Warehouse materials workbench</p>
          <p className="text-muted-foreground">
            Review live stock, offcuts, and bar demand before reserving.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/warehouse/reservations?project_id=${project.id}`}>
            Open workbench
          </Link>
        </Button>
      </div>
    );
  }

  async function handleReserve() {
    setSubmitting(true);

    try {
      const response = await reserveProjectMaterials(project.id);
      if (!response.success) {
        toast.error(response.message ?? "Could not reserve materials.");
        return;
      }

      toast.success("Materials reserved for this project (stock held, not deducted yet).");
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
          Stock is available. Reserve materials to hold inventory for this project — stock is
          deducted later at release handover.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/warehouse/reservations?project_id=${project.id}`}>Workbench</Link>
        </Button>
        <Button size="sm" onClick={() => void handleReserve()} disabled={submitting}>
          {submitting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Package className="mr-2 h-4 w-4" />
          )}
          Reserve materials
        </Button>
      </div>
    </div>
  );
}
