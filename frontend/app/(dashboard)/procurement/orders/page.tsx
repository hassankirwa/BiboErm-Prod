import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PurchaseOrdersStats } from "@/components/procurement/purchase-orders-stats";
import { PurchaseOrdersTable } from "@/components/procurement/purchase-orders-table";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PurchaseOrdersPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Purchase Orders"
        subtitle="Manage procurement orders and start new POs from approved requisitions"
        actions={
          <Button asChild size="sm" className="h-8 gap-1.5">
            <Link href="/procurement/requisitions">
              <ArrowRight className="h-4 w-4" />
              Open requisitions
            </Link>
          </Button>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <PurchaseOrdersStats />
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search POs..."
                className="pl-8 h-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PurchaseOrdersTable />
        </div>
      </div>
    </div>
  );
}
