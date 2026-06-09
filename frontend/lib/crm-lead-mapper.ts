import type { ApiLead } from "@/lib/api/crm/types";
import { leadDisplayName } from "@/lib/api/crm/leads";
import {
  resolveLeadListCompany,
  resolveLeadListEmail,
  resolveLeadListPhone,
} from "@/lib/crm/lead-contact-utils";
import { getUserInitials } from "@/lib/api/auth";
import {
  getLeadStatusBadgeClass,
  getLeadStatusLabel,
  statusToKanbanStage,
} from "@/lib/crm-lead-status";
import type { LeadKanbanCard, LeadKanbanStageId } from "@/lib/leads-kanban-data";
import type { LeadListRow } from "@/lib/leads-list-data";
import type { LeadMapMarker } from "@/lib/leads-map-data";
import { resolveCoordsForLocation } from "@/lib/leads-map-data";

function pickOptional(value: string): string | undefined {
  return value === "—" ? undefined : value;
}

export function apiLeadToListRow(lead: ApiLead): LeadListRow {
  const status = (lead.status ?? "new").toLowerCase();
  const ownerName =
    lead.lead_owner?.name ?? lead.assigned_sales_user?.name ?? "Unassigned";

  return {
    id: String(lead.id),
    leadName: leadDisplayName(lead),
    company: resolveLeadListCompany(lead),
    email: resolveLeadListEmail(lead),
    phone: resolveLeadListPhone(lead),
    stage: getLeadStatusLabel(status),
    stageClassName: getLeadStatusBadgeClass(status),
    source: lead.lead_source?.label ?? lead.source ?? "—",
    owner: ownerName,
    ownerInitials: getUserInitials(ownerName),
    activity: { type: "calendar" },
    statusKey: status,
  };
}

export function apiLeadToKanbanCard(lead: ApiLead): LeadKanbanCard {
  const status = (lead.status ?? "new").toLowerCase();
  const ownerName =
    lead.lead_owner?.name ?? lead.assigned_sales_user?.name ?? "Unassigned";
  const ownerId =
    lead.lead_owner_id ?? lead.assigned_sales_user_id ?? lead.assigned_to ?? null;

  return {
    id: String(lead.id),
    stageId: statusToKanbanStage(status),
    statusKey: status,
    title: leadDisplayName(lead),
    location: lead.site_address ?? lead.area_estate ?? "—",
    owner: ownerName,
    ownerId,
    leadSourceId: lead.lead_source_id ?? null,
    nextActionDate:
      lead.next_follow_up_at?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    estimatedValue: Number(lead.estimated_value ?? lead.estimated_budget ?? 0),
    tag: getLeadStatusLabel(status),
    company: pickOptional(resolveLeadListCompany(lead)),
    phone: pickOptional(resolveLeadListPhone(lead)),
    email: pickOptional(resolveLeadListEmail(lead)),
    source: lead.lead_source?.label ?? lead.source ?? undefined,
    notes: lead.notes ?? (lead as import("@/lib/api/crm/types").ApiLeadDetail).requirement_description ?? undefined,
    latitude: lead.latitude ?? null,
    longitude: lead.longitude ?? null,
  };
}

export function apiLeadToMapMarkers(leads: ApiLead[]): LeadMapMarker[] {
  const cards = leads.map(apiLeadToKanbanCard);
  return apiCardsToMapMarkers(cards);
}

export function apiCardsToMapMarkers(cards: LeadKanbanCard[]): LeadMapMarker[] {
  const defaultNairobi: [number, number] = [-1.2864, 36.8172];

  return cards.map((card) => {
    const hasCoords =
      card.latitude != null &&
      card.longitude != null &&
      !Number.isNaN(card.latitude) &&
      !Number.isNaN(card.longitude);

    const coords: [number, number] = hasCoords
      ? [Number(card.latitude), Number(card.longitude)]
      : resolveCoordsForLocation(card.location) ??
        resolveCoordsForLocation(card.title) ??
        defaultNairobi;
    return {
      id: card.id,
      title: card.title,
      location: card.location,
      lat: coords[0],
      lng: coords[1],
      stage: card.tag,
      stageClassName: "",
      owner: card.owner,
      company: card.company ?? "—",
    };
  });
}

export function apiCardsToCalendarEvents(
  cards: LeadKanbanCard[],
): import("@/lib/leads-calendar-data").LeadCalendarEvent[] {
  return cards.map((card) => ({
    id: `lead-${card.id}`,
    leadId: card.id,
    title: card.title,
    subtitle: card.location,
    date: card.nextActionDate,
    startTime: "09:00",
    endTime: "10:00",
    type: "follow_up" as const,
    owner: card.owner,
    href: `/crm/leads/${card.id}`,
  }));
}

const calendarActivityTypeMap: Record<
  string,
  import("@/lib/leads-calendar-data").LeadCalendarEventType
> = {
  site_visit: "site_visit",
  schedule_call: "call",
  call_log: "call",
  meeting_note: "meeting",
  meeting: "meeting",
  create_task: "task",
  follow_up: "follow_up",
  email_sent: "follow_up",
};

export function crmCalendarEventsToLeadEvents(
  events: import("@/lib/api/crm/calendar").CrmCalendarEvent[],
): import("@/lib/leads-calendar-data").LeadCalendarEvent[] {
  return events.map((event) => {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : null;
    const type =
      calendarActivityTypeMap[event.type] ??
      (event.source === "site_visit" ? "site_visit" : "task");

    return {
      id: event.id,
      leadId: event.lead_id ? String(event.lead_id) : undefined,
      title: event.title,
      subtitle: event.subtitle ?? "",
      date: start.toISOString().slice(0, 10),
      startTime: start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      endTime: end
        ? end.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : undefined,
      type,
      owner: event.assigned_to?.name ?? "",
      location: event.location ?? undefined,
      href: event.href,
    };
  });
}

export function getLeadStageLabel(stageId: LeadKanbanStageId): string {
  return getLeadStatusLabel(stageId);
}
