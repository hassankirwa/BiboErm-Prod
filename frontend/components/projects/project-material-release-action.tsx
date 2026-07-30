"use client";

import Link from "next/link";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import type { ProjectDetail } from "@/lib/api/projects";

type ProjectMaterialReleaseActionProps = {
  project: ProjectDetail;
  onReleased?: () => void;
};

const RELEASE_STAGES = new Set(["materials_ready", "materials_reserved"]);

export function ProjectMaterialReleaseAction({
  project,
}: ProjectMaterialReleaseActionProps) {
  const { can } = usePermissions();

  if (!can("warehouse.reservations.release") || !RELEASE_STAGES.has(project.stage)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-success/30 bg-success/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="font-medium">Release materials to production</p>
        <p className="text-muted-foreground">
          Hand over reserved stock to a named receiver. On-hand quantity is deducted at
          warehouse release — use the workbench to select who received the materials.
        </p>
      </div>
      <Button size="sm" asChild>
        <Link href={`/warehouse/reservations?project_id=${project.id}`}>
          <Truck className="mr-2 h-4 w-4" />
          Open release workbench
        </Link>
      </Button>
    </div>
  );
}
