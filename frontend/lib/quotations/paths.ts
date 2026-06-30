export type QuotationViewMode = "quotation" | "crm";

/** @deprecated Use "quotation" */
export type LegacyQuotationViewMode = "projects" | QuotationViewMode;

export function normalizeQuotationViewMode(
  mode: LegacyQuotationViewMode,
): QuotationViewMode {
  return mode === "crm" ? "crm" : "quotation";
}

export function quotationListPath(mode: QuotationViewMode = "quotation"): string {
  return mode === "crm" ? "/crm/deals" : "/quotation/proforma";
}

export type QuotationNewParams = {
  accountId?: number | string;
  /** Alias for accountId — accounts represent quotation projects in CRM. */
  projectId?: number | string;
  designJobId?: number | string;
};

export function quotationNewPath(
  params?: QuotationNewParams | number | string,
): string {
  const base = "/quotation/proforma/new";
  if (params == null || params === "") return base;

  const normalized: QuotationNewParams =
    typeof params === "object" ? params : { accountId: params };

  const search = new URLSearchParams();
  const accountId = normalized.accountId ?? normalized.projectId;
  if (accountId != null && accountId !== "") {
    search.set("accountId", String(accountId));
  }
  if (normalized.designJobId != null && normalized.designJobId !== "") {
    search.set("designJobId", String(normalized.designJobId));
  }

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export function quotationDetailPath(
  id: number,
  mode: LegacyQuotationViewMode = "quotation",
): string {
  return normalizeQuotationViewMode(mode) === "crm"
    ? `/crm/quotations/${id}`
    : `/quotation/proforma/${id}`;
}

export function quotationPreviewPath(
  id: number,
  mode: LegacyQuotationViewMode = "quotation",
): string {
  return normalizeQuotationViewMode(mode) === "crm"
    ? `/crm/quotations/${id}/preview`
    : `/quotation/proforma/${id}/preview`;
}
