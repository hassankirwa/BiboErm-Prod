import { AppHeader } from "@/components/app-header";
import { DealsKanban } from "@/components/crm/deals-kanban";
import { DealsPipeline } from "@/components/crm/deals-pipeline";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DealsPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Deals"
        subtitle="Track your sales pipeline"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <DealsPipeline />
          <Tabs defaultValue="kanban" className="space-y-4">
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
            <TabsContent value="kanban">
              <DealsKanban />
            </TabsContent>
            <TabsContent value="list">
              <div className="text-center py-12 text-muted-foreground">
                List view coming soon
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
