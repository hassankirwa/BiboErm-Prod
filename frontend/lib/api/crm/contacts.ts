import { apiFetch } from "../client";
import type { ApiContact, PaginatedResponse } from "./types";

export type { ApiContact } from "./types";

function buildQuery(params?: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export function contactDisplayName(contact: ApiContact): string {
  if (contact.name?.trim()) return contact.name.trim();
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";
}

export async function fetchContacts(params?: {
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiContact>> {
  return apiFetch<PaginatedResponse<ApiContact>>(
    `/api/v1/crm/contacts${buildQuery(params)}`,
  );
}

export async function fetchContact(id: number): Promise<ApiContact> {
  return apiFetch<ApiContact>(`/api/v1/crm/contacts/${id}`);
}
