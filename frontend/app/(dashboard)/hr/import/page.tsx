"use client";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { StaffImportPanel } from "@/components/hr/staff-import-panel";

export default function HrImportPage() {
  return (
    <PermissionGuard permissions={["employees.import"]}>
      <StaffImportPanel />
    </PermissionGuard>
  );
}
