import { apiFetch } from "../client";
import type { CrmLookupItem } from "./types";

export type CrmLookups = {
  lead_sources: CrmLookupItem[];
  lead_types: CrmLookupItem[];
  product_interests: CrmLookupItem[];
  counties: CrmLookupItem[];
  loss_reasons: CrmLookupItem[];
  visit_purposes: CrmLookupItem[];
};

export async function fetchCrmLookups(params?: {
  active_only?: boolean;
}): Promise<{ data: CrmLookups }> {
  const qs = new URLSearchParams();
  if (params?.active_only === false) {
    qs.set("active_only", "0");
  }
  const query = qs.toString();
  return apiFetch<{ data: CrmLookups }>(
    `/api/v1/crm/lookups${query ? `?${query}` : ""}`,
  );
}
