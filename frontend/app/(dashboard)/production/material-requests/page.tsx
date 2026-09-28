"use client";

import { MaterialRequestsWorkbench } from "@/components/warehouse/material-requests-workbench";

export default function ProductionMaterialRequestsPage() {
  return (
    <MaterialRequestsWorkbench
      source="production"
      title="Additional materials"
      subtitle="Request extra materials from warehouse for projects still in progress"
    />
  );
}
