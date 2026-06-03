"use client";

import { GoodsReceiptCreateForm } from "@/components/procurement/goods-receipt-create-form";

export default function WarehouseReceiveCreatePage() {
  return (
    <GoodsReceiptCreateForm
      backHref="/warehouse/receiving-logs"
      detailBasePath="/procurement/goods-receipts"
      title="Receive from purchase order"
      subtitle="Create a goods receipt note and continue to quality checks and stock putaway"
    />
  );
}
