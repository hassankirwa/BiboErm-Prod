import { AppHeader } from "@/components/app-header";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { DealsKanban } from "@/components/crm/deals-kanban";
import { DealsPipeline } from "@/components/crm/deals-pipeline";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DealsPage() {
  return (
    <CrmPageShell>
      <AppHeader
        title="Deals"
        subtitle="Track your sales pipeline"
        actions={
          <Button size="sm" className="h-8 w-full gap-1.5 sm:w-auto">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        }
      />
      <CrmPageContent>
        <DealsPipeline />
        <Tabs defaultValue="kanban" className="min-w-0 space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="min-w-0">
            <DealsKanban />
          </TabsContent>
          <TabsContent value="list">
            <div className="py-12 text-center text-muted-foreground">
              List view coming soon
            </div>
          </TabsContent>
        </Tabs>
      </CrmPageContent>
    </CrmPageShell>
  );
}
