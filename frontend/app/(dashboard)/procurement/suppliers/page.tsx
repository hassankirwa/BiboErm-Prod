import { AppHeader } from "@/components/app-header";
import { SuppliersTable } from "@/components/procurement/suppliers-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SuppliersPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Suppliers"
        subtitle="Manage your supplier directory"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search suppliers..."
              className="pl-8 h-9"
            />
          </div>
          <SuppliersTable />
        </div>
      </div>
    </div>
  );
}
