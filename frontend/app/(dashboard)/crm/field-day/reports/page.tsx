"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { FieldDayReportsPanel } from "@/components/crm/field-day-reports-panel";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

export default function FieldDayReportsPage() {
  const { can } = usePermissions();
  const canView = can("field_day.view");

  return (
    <CrmPageShell>
      <AppHeader
        title="Field Day Reports"
        subtitle="Review routes, visit pins, and outcomes by date"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm/field-day">Today&apos;s field day</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm">CRM Home</Link>
            </Button>
          </div>
        }
      />
      <CrmPageContent className="pb-8">
        {canView ? (
          <FieldDayReportsPanel />
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have permission to view field day reports.
          </p>
        )}
      </CrmPageContent>
    </CrmPageShell>
  );
}
