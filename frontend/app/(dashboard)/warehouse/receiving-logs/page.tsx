"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { GoodsReceiptsTable } from "@/components/procurement/goods-receipts-table";

export default function WarehouseReceivingLogsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Receiving logs"
        subtitle="Warehouse view of goods received from purchase orders"
        actions={
          <Button asChild>
            <Link href="/warehouse/receive/create">Create from PO</Link>
          </Button>
        }
      />
      <div className="p-6">
        <GoodsReceiptsTable detailBasePath="/procurement/goods-receipts" />
      </div>
    </div>
  );
}
