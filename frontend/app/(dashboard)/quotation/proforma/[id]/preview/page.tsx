"use client";

import { use } from "react";
import { QuotationPreviewView } from "@/components/quotations/quotation-preview-view";

export default function QuotationProformaPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <QuotationPreviewView quotationId={Number(id)} mode="quotation" />;
}
