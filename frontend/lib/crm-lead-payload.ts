import type { CreateLeadPayload } from "@/lib/api/crm/leads";
import type { CreateContactPayload } from "@/lib/api/crm/contacts";
import { kanbanStageToStatus } from "@/lib/crm-lead-status";
import {
  buildSiteAddressFromLocation,
  resolveCountyId,
  resolveKenyaCoordinates,
} from "@/lib/kenya-locations";
import type { CrmLookupItem } from "@/lib/api/crm/types";
import {
  hasContactInfo,
  type LeadFormValues,
} from "@/lib/lead-form-config";

export function leadFormToCreatePayload(
  values: LeadFormValues,
  lookups?: {
    counties?: CrmLookupItem[];
    product_interests?: CrmLookupItem[];
    fieldDayPinId?: number | null;
  },
): CreateLeadPayload {
  const contactProvided = hasContactInfo(values);
  const siteAddress =
    buildSiteAddressFromLocation(values) ||
    values.siteAddress.trim() ||
    values.location.trim() ||
    null;

  const coords = resolveKenyaCoordinates({
    countySlug: values.countySlug,
    subcounty: values.subcounty,
    latitude: values.latitude,
    longitude: values.longitude,
  });

  const productSlugs =
    values.productInterests.length > 0
      ? values.productInterests
      : ["custom"];

  const payload: CreateLeadPayload = {
    name: values.title.trim(),
    lead_type_id: values.leadTypeId,
    lead_source_id: values.leadSourceId,
    status: kanbanStageToStatus(values.stageId),
    priority: values.priority || tagToPriority(values.tag),
    lead_owner_id: values.ownerId,
    assigned_sales_user_id: values.ownerId,
    assigned_field_officer_id: null,
    account_name: values.company.trim() || null,
    site_name: values.siteName.trim() || values.title.trim() || null,
    site_address: siteAddress,
    county_id: resolveCountyId(lookups?.counties, values.countySlug),
    subcounty: values.subcounty.trim() || null,
    ward: values.ward.trim() || null,
    area_estate: values.areaEstate.trim() || null,
    landmark: values.landmark.trim() || null,
    latitude: coords?.lat ?? values.latitude ?? null,
    longitude: coords?.lng ?? values.longitude ?? null,
    product_interests: productSlugs,
    requirement_description:
      values.requirementDescription.trim() ||
      values.notes.trim() ||
      values.title.trim() ||
      "Lead created from CRM",
    property_site_type: values.propertySiteType || null,
    building_construction_stage_id: values.buildingConstructionStageId,
    estimated_value: values.estimatedValue || undefined,
    estimated_budget: values.estimatedBudget || undefined,
    urgency: values.urgency || null,
    expected_timeline: values.expectedTimeline.trim() || null,
    need_site_visit: false,
    next_action: values.nextAction.trim() || null,
    next_follow_up_at: values.nextActionDate || undefined,
    notes: values.notes.trim() || null,
    preferred_contact_method: values.preferredContactMethod || null,
    preferred_contact_time: values.preferredContactTime.trim() || null,
    job_title: values.jobTitle.trim() || null,
    whatsapp: values.whatsapp.trim() || null,
  };

  if (contactProvided) {
    payload.contact_person_name =
      values.contactPersonName.trim() || values.title.trim();
    payload.phone = values.phone.trim() || null;
    payload.email = values.email.trim() || null;
  }

  if (lookups?.fieldDayPinId) {
    payload.field_day_pin_id = lookups.fieldDayPinId;
  }

  return payload;
}

export function leadFormToUpdatePayload(
  values: LeadFormValues,
  lookups?: { counties?: CrmLookupItem[] },
): Partial<CreateLeadPayload> {
  return {
    ...leadFormToCreatePayload(values, lookups),
    need_site_visit: values.needSiteVisit,
    assigned_field_officer_id: values.needSiteVisit
      ? values.assignedFieldOfficerId
      : null,
  };
}

function tagToPriority(tag: string): string | undefined {
  const normalized = tag.toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("follow")) return "medium";
  return undefined;
}

export function leadFormToContactPayload(
  values: LeadFormValues,
  leadId: number,
): CreateContactPayload | null {
  if (!hasContactInfo(values)) {
    return null;
  }

  const name =
    values.contactPersonName.trim() ||
    values.phone.trim() ||
    values.email.trim();

  return {
    name,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
    contact_owner_id: values.ownerId ?? undefined,
    source_lead_id: leadId,
    notes: values.notes.trim() || undefined,
  };
}
