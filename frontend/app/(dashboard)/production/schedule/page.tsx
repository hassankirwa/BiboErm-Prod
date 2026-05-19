import { AppHeader } from "@/components/app-header";
import { ProductionSchedule } from "@/components/production/production-schedule";
import { ProductionStats } from "@/components/production/production-stats";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

export default function ProductionSchedulePage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Production Schedule"
        subtitle="Manage production pipeline"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Calendar className="h-4 w-4" />
              Calendar View
            </Button>
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <ProductionStats />
          <ProductionSchedule />
        </div>
      </div>
    </div>
  );
}
