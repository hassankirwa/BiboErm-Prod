import type { LeadFormValues } from "@/lib/lead-form-config";
import { tagOptions } from "@/lib/lead-form-config";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";
import type { ApiLeadDetail } from "@/lib/api/crm/types";
import { statusToKanbanStage } from "@/lib/crm-lead-status";
import { KENYA_COUNTIES } from "@/lib/kenya-locations";

function countySlugFromLead(lead: ApiLeadDetail): string {
  const address = `${lead.site_address ?? ""} ${lead.area_estate ?? ""} ${lead.subcounty ?? ""}`.toLowerCase();
  const match = KENYA_COUNTIES.find((c) =>
    address.includes(c.label.toLowerCase()),
  );
  return match?.slug ?? "";
}

export function apiLeadToFormValues(lead: ApiLeadDetail): LeadFormValues {
  return {
    title: lead.name ?? lead.site_name ?? "",
    leadTypeId: lead.lead_type_id ?? null,
    leadSourceId: lead.lead_source_id ?? null,
    stageId: statusToKanbanStage(lead.status),
    ownerId:
      lead.lead_owner_id ?? lead.assigned_sales_user_id ?? lead.assigned_to ?? null,
    priority: lead.priority ?? "medium",
    tag: tagOptions.includes(lead.priority as (typeof tagOptions)[number])
      ? (lead.priority as string)
      : tagOptions[0],
    contactPersonName: lead.contact_person_name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    whatsapp: lead.whatsapp ?? "",
    jobTitle: lead.job_title ?? "",
    preferredContactMethod: lead.preferred_contact_method ?? "",
    preferredContactTime: lead.preferred_contact_time ?? "",
    company: lead.account_name ?? lead.company ?? "",
    siteName: lead.site_name ?? "",
    siteAddress: lead.site_address ?? "",
    location: lead.site_address ?? lead.area_estate ?? "",
    countySlug: countySlugFromLead(lead),
    subcounty: lead.subcounty ?? "",
    ward: lead.ward ?? "",
    areaEstate: lead.area_estate ?? "",
    landmark: lead.landmark ?? "",
    latitude: lead.latitude ?? null,
    longitude: lead.longitude ?? null,
    needSiteVisit: lead.need_site_visit ?? false,
    assignedFieldOfficerId: lead.assigned_field_officer_id ?? null,
    siteVisitDate: "",
    siteVisitTime: "",
    siteVisitNotesForOfficer: "",
    productInterests: lead.product_interests ?? [],
    requirementDescription: lead.requirement_description ?? "",
    propertySiteType: lead.property_site_type ?? "",
    urgency: lead.urgency ?? "",
    expectedTimeline: lead.expected_timeline ?? "",
    nextActionDate:
      lead.next_follow_up_at?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    nextAction: lead.next_action ?? "",
    notes: lead.notes ?? lead.internal_notes ?? "",
  };
}

export function cardToFormValues(card: LeadKanbanCard): LeadFormValues {
  return {
    title: card.title,
    leadTypeId: null,
    leadSourceId: card.leadSourceId ?? null,
    stageId: card.stageId,
    ownerId: card.ownerId ?? null,
    priority: "medium",
    tag: tagOptions.includes(card.tag as (typeof tagOptions)[number])
      ? card.tag
      : tagOptions[0],
    contactPersonName: "",
    phone: card.phone ?? "",
    email: card.email ?? "",
    whatsapp: "",
    jobTitle: "",
    preferredContactMethod: "",
    preferredContactTime: "",
    company: card.company ?? "",
    siteName: "",
    siteAddress: card.location,
    location: card.location,
    countySlug: "",
    subcounty: "",
    ward: "",
    areaEstate: "",
    landmark: "",
    latitude: card.latitude ?? null,
    longitude: card.longitude ?? null,
    needSiteVisit: false,
    assignedFieldOfficerId: null,
    siteVisitDate: "",
    siteVisitTime: "",
    siteVisitNotesForOfficer: "",
    productInterests: [],
    requirementDescription: card.notes ?? "",
    propertySiteType: "",
    urgency: "",
    expectedTimeline: "",
    nextActionDate: card.nextActionDate,
    nextAction: "",
    notes: card.notes ?? "",
  };
}
