import { AppHeader } from "@/components/app-header";
import { InventoryStats } from "@/components/warehouse/inventory-stats";
import { InventoryFilters } from "@/components/warehouse/inventory-filters";
import { InventoryTable } from "@/components/warehouse/inventory-table";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Inventory"
        subtitle="Manage warehouse stock"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Download className="h-4 w-4" />
              Stock Report
            </Button>
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <InventoryStats />
          <InventoryFilters />
          <InventoryTable />
        </div>
      </div>
    </div>
  );
}
