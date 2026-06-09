"use client";

import { use } from "react";
import { QuotationDetailView } from "@/components/quotations/quotation-detail-view";

export default function CrmQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <QuotationDetailView quotationId={Number(id)} mode="crm" />;
}
