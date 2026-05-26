import type { ApiLeadDetail } from "@/lib/api/crm/types";

export type AccountFormFromLead = {
  name: string;
  account_type: string;
  industry: string;
  phone: string;
  email: string;
  website: string;
  kra_pin: string;
  billing_address: string;
  physical_address: string;
  status: string;
  county_id: number | null;
  account_owner_id: number | null;
  source_lead_id: number;
};

export const EMPTY_ACCOUNT_FORM = {
  name: "",
  account_type: "",
  industry: "",
  phone: "",
  email: "",
  website: "",
  kra_pin: "",
  billing_address: "",
  physical_address: "",
  status: "prospect",
  county_id: null as number | null,
  account_owner_id: null as number | null,
  source_lead_id: null as number | null,
};

/** Maps lead fields to account form values (mirrors LeadConversionService). */
export function mapLeadToAccountForm(lead: ApiLeadDetail): AccountFormFromLead {
  const name =
    lead.account_name?.trim() ||
    lead.company?.trim() ||
    lead.name?.trim() ||
    "";

  return {
    name,
    account_type: lead.account_type?.trim() ?? "",
    industry: lead.industry?.trim() ?? "",
    phone: (lead.company_phone ?? lead.phone)?.trim() ?? "",
    email: (lead.company_email ?? lead.email)?.trim() ?? "",
    website: lead.website?.trim() ?? "",
    kra_pin: lead.kra_pin?.trim() ?? "",
    billing_address: lead.billing_address?.trim() ?? "",
    physical_address: lead.site_address?.trim() ?? "",
    status: "prospect",
    county_id: lead.county_id ?? null,
    account_owner_id: lead.lead_owner_id ?? null,
    source_lead_id: lead.id,
  };
}
