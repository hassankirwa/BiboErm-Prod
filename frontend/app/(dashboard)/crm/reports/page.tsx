import { AppHeader } from "@/components/app-header";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { CrmSalesReportsDashboard } from "@/components/crm/crm-sales-reports-dashboard";
import { CrmReportsList } from "@/components/crm/crm-reports-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CrmReportsPage() {
  return (
    <CrmPageShell>
      <AppHeader title="Sales Reports" />
      <CrmPageContent className="space-y-5 pb-8">
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
      </CrmPageContent>
    </CrmPageShell>
  );
}
