import { apiFetch } from "../client";

import type { ApiAccount, ApiDeal, PaginatedResponse } from "./types";

import { unwrapResource } from "./types";



export type { ApiAccount } from "./types";



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



export type CreateAccountPayload = {

  name: string;

  account_type?: string;

  industry?: string;

  phone?: string;

  email?: string;

  website?: string;

  kra_pin?: string;

  billing_address?: string;

  physical_address?: string;

  county_id?: number;

  status?: string;

  account_owner_id?: number;

  primary_contact_id?: number;

  source_lead_id?: number;

};



export type UpdateAccountPayload = Partial<CreateAccountPayload>;



export async function fetchAccounts(params?: {

  search?: string;

  status?: string;

  page?: number;

  per_page?: number;

}): Promise<PaginatedResponse<ApiAccount>> {

  return apiFetch<PaginatedResponse<ApiAccount>>(

    `/api/v1/crm/accounts${buildQuery(params)}`,

  );

}



export async function fetchAccount(id: number): Promise<ApiAccount> {

  const res = await apiFetch<ApiAccount | { data: ApiAccount }>(

    `/api/v1/crm/accounts/${id}`,

  );

  return unwrapResource(res);

}



export async function createAccount(

  payload: CreateAccountPayload,

): Promise<ApiAccount> {

  const res = await apiFetch<ApiAccount | { data: ApiAccount }>(

    "/api/v1/crm/accounts",

    {

      method: "POST",

      json: payload,

    },

  );

  return unwrapResource(res);

}



export async function updateAccount(

  id: number,

  payload: UpdateAccountPayload,

): Promise<ApiAccount> {

  const res = await apiFetch<ApiAccount | { data: ApiAccount }>(

    `/api/v1/crm/accounts/${id}`,

    {

      method: "PUT",

      json: payload,

    },

  );

  return unwrapResource(res);

}



export async function fetchAccountDeals(

  accountId: number,

  params?: { page?: number; per_page?: number },

): Promise<PaginatedResponse<ApiDeal>> {

  return apiFetch<PaginatedResponse<ApiDeal>>(

    `/api/v1/crm/accounts/${accountId}/deals${buildQuery(params)}`,

  );

}


