"use client";

import { GoodsReceiptCreateForm } from "@/components/procurement/goods-receipt-create-form";

export default function ProcurementGoodsReceiptCreatePage() {
  return (
    <GoodsReceiptCreateForm
      backHref="/procurement/goods-receipts"
      detailBasePath="/procurement/goods-receipts"
    />
  );
}
