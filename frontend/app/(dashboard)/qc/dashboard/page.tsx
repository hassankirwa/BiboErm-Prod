"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { QcDashboardPanel } from "@/components/qc/qc-dashboard-panel";
import { getQcDashboardSummary, type QcDashboardSummary } from "@/lib/api/qc";
import { toast } from "sonner";

function QcDashboardPageContent() {
  const [summary, setSummary] = useState<QcDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQcDashboardSummary()
      .then((res) => setSummary(res.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load QC dashboard.");
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="QC Dashboard"
        subtitle="Defects, due audits, and quality trends"
      />
      <div className="p-6">
        <QcDashboardPanel summary={summary} loading={loading} />
      </div>
    </div>
  );
}

export default function QcDashboardPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view the QC dashboard.
          </p>
        </div>
      }
    >
      <QcDashboardPageContent />
    </PermissionGuard>
  );
}
