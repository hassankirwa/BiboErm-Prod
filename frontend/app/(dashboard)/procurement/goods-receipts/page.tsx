"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { GoodsReceiptsTable } from "@/components/procurement/goods-receipts-table";

export default function ProcurementGoodsReceiptsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Receiving logs"
        subtitle="Track goods receipt notes, quantities received, and verification status"
        actions={
          <Button asChild>
            <Link href="/procurement/goods-receipts/create">Create from PO</Link>
          </Button>
        }
      />
      <div className="p-6">
        <GoodsReceiptsTable />
      </div>
    </div>
  );
}
