"use client";

import { AppHeader } from "@/components/app-header";
import { OperationsAnalyticsDashboard } from "@/components/analytics/operations-analytics-dashboard";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/contexts/auth-context";

function AnalyticsContent() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <AppHeader
        title="Analytics"
        subtitle={
          user?.name
            ? `Operations overview for ${user.name}`
            : "Live operations overview"
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <OperationsAnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGate
      anyOf={["analytics.view", "crm.view", "projects.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view analytics.
          </p>
        </div>
      }
    >
      <AnalyticsContent />
    </PermissionGate>
  );
}
