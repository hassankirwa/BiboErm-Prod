"use client";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { PayrollSettingsPanel } from "@/components/hr/payroll-settings-panel";

export default function HrSettingsPage() {
  return (
    <PermissionGuard permissions={["payroll.manage"]}>
      <PayrollSettingsPanel />
    </PermissionGuard>
  );
}
