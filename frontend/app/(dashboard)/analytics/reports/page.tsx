import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { CrmSalesReportsDashboard } from "@/components/crm/crm-sales-reports-dashboard";
import { CrmReportsList } from "@/components/crm/crm-reports-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AnalyticsReportsPage() {
  return (
    <PermissionGate
      permission="crm.view"
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view reports.
          </p>
        </div>
      }
    >
      <div className="flex flex-col">
        <AppHeader
          title="Reports"
          subtitle="Live sales and CRM reports with CSV exports"
        />
        <div className="space-y-5 p-6 pb-8">
          <Tabs defaultValue="dashboard" className="min-w-0 space-y-5">
            <TabsList className="h-9 rounded-[5px]">
              <TabsTrigger value="dashboard" className="rounded-[5px] text-sm">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="exports" className="rounded-[5px] text-sm">
                CSV Exports
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="mt-0">
              <CrmSalesReportsDashboard />
            </TabsContent>
            <TabsContent value="exports" className="mt-0">
              <CrmReportsList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGate>
  );
}
