export type QuotationViewMode = "projects" | "crm";

export function quotationDetailPath(id: number, mode: QuotationViewMode): string {
  return mode === "crm" ? `/crm/quotations/${id}` : `/projects/quotations/${id}`;
}

export function quotationPreviewPath(id: number, mode: QuotationViewMode): string {
  return mode === "crm"
    ? `/crm/quotations/${id}/preview`
    : `/projects/quotations/${id}/preview`;
}

export function quotationListPath(mode: QuotationViewMode): string {
  return mode === "crm" ? "/crm/deals" : "/projects/quotations";
}
