import { apiFetch } from "../client";
import type { CrmLookupItem } from "./types";

export type CrmLookups = {
  lead_sources: CrmLookupItem[];
  lead_types: CrmLookupItem[];
  product_interests: CrmLookupItem[];
  counties: CrmLookupItem[];
  loss_reasons: CrmLookupItem[];
  visit_purposes: CrmLookupItem[];
  building_construction_stages: CrmLookupItem[];
};

export type CrmAssignableUser = {
  id: number;
  name: string;
  email: string;
};

export async function fetchCrmLookups(): Promise<{ data: CrmLookups }> {
  return apiFetch<{ data: CrmLookups }>("/api/v1/crm/lookups");
}

export async function fetchCrmAssignableUsers(params?: {
  role?: string;
  context?: "site_visits";
  roles?: string[];
}): Promise<{ data: CrmAssignableUser[] }> {
  const qs = new URLSearchParams();
  if (params?.role) qs.set("role", params.role);
  if (params?.context) qs.set("context", params.context);
  params?.roles?.forEach((role) => qs.append("roles[]", role));
  const query = qs.toString();
  return apiFetch<{ data: CrmAssignableUser[] }>(
    `/api/v1/crm/lookups/users${query ? `?${query}` : ""}`,
  );
}
