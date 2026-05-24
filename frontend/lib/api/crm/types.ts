import type { ApiUser } from "../auth";

export type PaginatedMeta = {
  current_page: number;
  last_page: number;
  per_page?: number;
  total: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta?: PaginatedMeta;
  links?: Record<string, string | null>;
};

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(value);
      return normalizeStringArray(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

export function unwrapResource<T>(res: T | { data: T }): T {
  if (res && typeof res === "object" && "data" in res && res.data) {
    return res.data;
  }
  return res as T;
}

export type CrmLookupItem = {
  id: number;
  slug: string;
  label: string;
  is_active: boolean;
};

export type ApiContact = {
  id: number;
  contact_number: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  job_title: string | null;
  preferred_contact_method: string | null;
  status: string | null;
  account_id: number | null;
  contact_owner_id: number | null;
  source_lead_id: number | null;
  notes: string | null;
  owner_id: number | null;
  account?: ApiAccount | null;
  owner?: ApiUser | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ApiAccount = {
  id: number;
  account_number: string | null;
  name: string;
  account_type: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  kra_pin: string | null;
  billing_address: string | null;
  physical_address: string | null;
  county_id: number | null;
  status: string | null;
  account_owner_id: number | null;
  primary_contact_id: number | null;
  source_lead_id: number | null;
  owner_id: number | null;
  owner?: ApiUser | null;
  contacts?: ApiContact[];
  created_at: string | null;
  updated_at: string | null;
};

export type BiboDealStage =
  | "new_deal"
  | "site_visit_pending"
  | "measurements_completed"
  | "quotation_preparation"
  | "quotation_sent"
  | "negotiation_revision"
  | "accepted"
  | "deposit_pending"
  | "deposit_recorded"
  | "won"
  | "project_created"
  | "lost";

export type ApiDeal = {
  id: number;
  deal_number: string | null;
  reference: string;
  name: string | null;
  title: string | null;
  account_id: number | null;
  contact_id: number | null;
  primary_contact_id: number | null;
  lead_id: number | null;
  source_lead_id: number | null;
  stage: BiboDealStage | string;
  status: string | null;
  amount: string | number | null;
  estimated_value: string | number | null;
  quotation_amount: string | number | null;
  final_agreed_amount: string | number | null;
  deposit_required_amount: string | number | null;
  deposit_required_percent: string | number | null;
  deposit_paid_amount: string | number | null;
  deposit_amount: string | number | null;
  payment_status: string | null;
  expected_close_date: string | null;
  expected_installation_date: string | null;
  product_interests: string[] | null;
  requirement_summary: string | null;
  site_address: string | null;
  latitude: number | null;
  longitude: number | null;
  probability: number | null;
  discount_requested: boolean | null;
  loss_reason_id: number | null;
  loss_notes: string | null;
  lost_reason: string | null;
  project_id: number | null;
  won_at: string | null;
  lost_at: string | null;
  owner_id: number | null;
  deal_owner_id: number | null;
  assigned_field_officer_id: number | null;
  contact?: ApiContact | null;
  account?: ApiAccount | null;
  owner?: ApiUser | null;
  quotations?: ApiQuotation[];
  payments?: ApiDealPayment[];
  created_at: string | null;
  updated_at: string | null;
};

export type ApiSiteVisit = {
  id: number;
  visit_number: string | null;
  title: string;
  lead_id: number | null;
  deal_id: number | null;
  account_id: number | null;
  contact_id: number | null;
  site_address: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_field_officer_id: number | null;
  scheduled_by: number | null;
  visit_date: string | null;
  visit_time: string | null;
  visit_purpose: string | null;
  status: string | null;
  notes_for_field_officer: string | null;
  actual_latitude: number | null;
  actual_longitude: number | null;
  arrival_at: string | null;
  completion_at: string | null;
  client_present: boolean | null;
  visit_outcome: string | null;
  follow_up_required: boolean | null;
  field_officer_notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  lead?: ApiLead | null;
  deal?: ApiDeal | null;
  assigned_field_officer?: ApiUser | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ApiLead = {
  id: number;
  lead_number: string | null;
  reference: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  lead_type_id: number | null;
  lead_source_id: number | null;
  status: string;
  priority: string | null;
  phone: string | null;
  email: string | null;
  contact_person_name: string | null;
  account_name: string | null;
  product_interests: string[] | null;
  estimated_budget: string | number | null;
  estimated_value: string | number | null;
  need_site_visit: boolean | null;
  site_address: string | null;
  county_id: number | null;
  next_follow_up_at: string | null;
  lead_owner_id: number | null;
  assigned_sales_user_id: number | null;
  assigned_field_officer_id: number | null;
  assigned_to: number | null;
  lead_owner?: ApiUser | null;
  assigned_sales_user?: ApiUser | null;
  assigned_field_officer?: ApiUser | null;
  assignee?: ApiUser | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ApiLeadDetail = ApiLead & {
  whatsapp: string | null;
  job_title: string | null;
  preferred_contact_method: string | null;
  preferred_contact_time: string | null;
  account_type: string | null;
  industry: string | null;
  company_phone: string | null;
  company_email: string | null;
  website: string | null;
  kra_pin: string | null;
  billing_address: string | null;
  requirement_description: string | null;
  property_site_type: string | null;
  estimated_scope: string | null;
  expected_timeline: string | null;
  urgency: string | null;
  site_name: string | null;
  latitude: number | null;
  longitude: number | null;
  area_estate: string | null;
  landmark: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  has_budget: string | null;
  decision_maker_identified: string | null;
  has_existing_supplier: string | null;
  expected_decision_date: string | null;
  lead_quality_score: string | null;
  qualification_notes: string | null;
  next_action: string | null;
  internal_notes: string | null;
  converted_at: string | null;
  converted_contact_id: number | null;
  converted_account_id: number | null;
  converted_deal_id: number | null;
  converted_contact?: ApiContact | null;
  converted_account?: ApiAccount | null;
  converted_deal?: ApiDeal | null;
  site_visits?: ApiSiteVisit[];
  activities?: ApiActivity[];
  created_by: number | null;
  updated_by: number | null;
  creator?: ApiUser | null;
};

export type ApiQuotationLine = {
  id: number;
  quotation_id: number;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  measurement_line_id?: number | null;
  sort_order?: number | null;
};

export type ApiQuotation = {
  id: number;
  quotation_number: string | null;
  deal_id: number;
  account_id: number | null;
  contact_id: number | null;
  prepared_by: number | null;
  status: string | null;
  subtotal: number | string | null;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  total_amount: number | string | null;
  valid_until: string | null;
  terms_conditions: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  revision_of_id: number | null;
  deal?: ApiDeal | null;
  account?: ApiAccount | null;
  contact?: ApiContact | null;
  lines?: ApiQuotationLine[];
  created_at: string | null;
  updated_at: string | null;
};

export type ApiDealPayment = {
  id: number;
  deal_id: number;
  quotation_id: number | null;
  payment_reference: string;
  payment_date: string;
  amount_paid: number | string;
  payment_method: string;
  payment_status: string | null;
  received_by?: number | null;
  proof_file_path?: string | null;
  proof_firebase_url?: string | null;
  notes: string | null;
  created_at?: string | null;
};

export type ApiFieldDayPin = {
  id: number;
  field_day_id: number;
  lead_id: number | null;
  contact_id: number | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
};

export type ApiFieldDay = {
  id: number;
  field_date: string;
  field_officer_id: number;
  created_by: number | null;
  notes: string | null;
  field_officer?: ApiUser | null;
  creator?: ApiUser | null;
  pins?: ApiFieldDayPin[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiActivity = {
  id: number;
  type: string;
  activity_type: string | null;
  subject: string;
  description: string | null;
  body: string | null;
  status: string;
  priority: string | null;
  due_at: string | null;
  completed_at: string | null;
  lead_id: number | null;
  contact_id: number | null;
  deal_id: number | null;
  assigned_to: number | null;
  assignee?: ApiUser | null;
  lead?: ApiLead | null;
  contact?: ApiContact | null;
  deal?: ApiDeal | null;
  created_at: string | null;
  updated_at: string | null;
};
