"use client";

import { MaterialRequestsWorkbench } from "@/components/warehouse/material-requests-workbench";

export default function WarehouseMaterialRequestsPage() {
  return (
    <MaterialRequestsWorkbench
      source="warehouse"
      title="Additional materials"
      subtitle="Request and fulfill extra materials for incomplete projects"
    />
  );
}
