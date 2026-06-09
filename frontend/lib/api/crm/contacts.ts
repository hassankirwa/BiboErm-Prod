import { apiFetch, invalidateApiCache } from "../client";
import { API_URL } from "../config";
import { buildCacheKey } from "../request-cache";
import type { ApiContact, PaginatedResponse } from "./types";
import { unwrapResource } from "./types";

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

export type CreateContactPayload = {
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  job_title?: string;
  preferred_contact_method?: string;
  status?: string;
  account_id?: number;
  contact_owner_id?: number;
  source_lead_id?: number | null;
  notes?: string;
};

export type UpdateContactPayload = Partial<CreateContactPayload>;

export function contactDisplayName(contact: ApiContact): string {
  if (contact.name?.trim()) return contact.name.trim();
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";
}

export async function fetchContacts(params?: {
  search?: string;
  status?: string;
  account_id?: number;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ApiContact>> {
  return apiFetch<PaginatedResponse<ApiContact>>(
    `/api/v1/crm/contacts${buildQuery(params)}`,
  );
}

export async function fetchContact(id: number): Promise<ApiContact> {
  const res = await apiFetch<ApiContact | { data: ApiContact }>(
    `/api/v1/crm/contacts/${id}`,
  );
  return unwrapResource(res);
}

export async function createContact(
  payload: CreateContactPayload,
): Promise<ApiContact> {
  const res = await apiFetch<ApiContact | { data: ApiContact }>(
    "/api/v1/crm/contacts",
    {
      method: "POST",
      json: payload,
    },
  );
  const contact = unwrapResource(res);
  if (payload.source_lead_id) {
    invalidateApiCache(
      buildCacheKey(
        "GET",
        `${API_URL}/api/v1/crm/leads/${payload.source_lead_id}`,
      ),
    );
  }
  return contact;
}

/**
 * Creates a contact linked to a lead. Returns null when contact fields are
 * empty or creation fails (lead creation should not depend on this).
 */
export async function createContactForLead(
  payload: CreateContactPayload,
): Promise<ApiContact | null> {
  const name = payload.name?.trim() ?? "";
  const phone = payload.phone?.trim() ?? "";
  const email = payload.email?.trim() ?? "";

  if (!name && !phone && !email) {
    return null;
  }

  try {
    return await createContact({
      ...payload,
      name: name || phone || email,
    });
  } catch {
    return null;
  }
}

export async function updateContact(
  id: number,
  payload: UpdateContactPayload,
): Promise<ApiContact> {
  const res = await apiFetch<ApiContact | { data: ApiContact }>(
    `/api/v1/crm/contacts/${id}`,
    {
      method: "PUT",
      json: payload,
    },
  );
  return unwrapResource(res);
}
