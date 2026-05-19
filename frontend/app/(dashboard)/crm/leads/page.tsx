import { AppHeader } from "@/components/app-header";
import { LeadsTable } from "@/components/crm/leads-table";
import { LeadsStats } from "@/components/crm/leads-stats";
import { LeadsFilters } from "@/components/crm/leads-filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function LeadsPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Leads"
        subtitle="Manage your sales leads"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <LeadsStats />
          <LeadsFilters />
          <LeadsTable />
        </div>
      </div>
    </div>
  );
}
