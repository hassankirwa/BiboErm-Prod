import type { ApiLead } from "@/lib/api/crm/types";
import { leadDisplayName } from "@/lib/api/crm/leads";
import {
  resolveLeadListCompany,
  resolveLeadListEmail,
  resolveLeadListPhone,
} from "@/lib/crm/lead-contact-utils";
import { getKanbanStageLabel } from "@/lib/crm-lead-pipeline";
import { getUserInitials } from "@/lib/api/auth";
import {
  getLeadStatusBadgeClass,
  getLeadStatusLabel,
  getPipelineStageDisplayLabel,
  resolvePipelineStage,
  statusToKanbanStage,
} from "@/lib/crm-lead-status";
import type { LeadKanbanCard, LeadKanbanStageId } from "@/lib/leads-kanban-data";
import type { LeadListRow } from "@/lib/leads-list-data";
import type { LeadMapMarker } from "@/lib/leads-map-data";
import { resolveCoordsForLocation } from "@/lib/leads-map-data";
import { KENYA_COUNTIES } from "@/lib/kenya-locations";

function pickOptional(value: string): string | undefined {
  return value === "—" ? undefined : value;
}

function resolveCountySlugFromLead(lead: ApiLead): string {
  if (lead.subcounty) {
    const normalizedSubcounty = lead.subcounty.trim().toLowerCase();
    for (const county of KENYA_COUNTIES) {
      if (
        county.subCounties.some(
          (subcounty) => subcounty.toLowerCase() === normalizedSubcounty,
        )
      ) {
        return county.slug;
      }
    }
  }

  const address = `${lead.site_address ?? ""} ${lead.area_estate ?? ""} ${lead.subcounty ?? ""}`.toLowerCase();
  const match = KENYA_COUNTIES.find((county) =>
    address.includes(county.label.toLowerCase()),
  );
  return match?.slug ?? "";
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
    stage: getPipelineStageDisplayLabel({
      pipeline_stage: lead.pipeline_stage,
      status,
    }),
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
  const pipelineStage = resolvePipelineStage({
    pipeline_stage: lead.pipeline_stage,
    status,
  });
  const stageId = statusToKanbanStage(status, lead.pipeline_stage);
  const ownerName =
    lead.lead_owner?.name ?? lead.assigned_sales_user?.name ?? "Unassigned";
  const ownerId =
    lead.lead_owner_id ?? lead.assigned_sales_user_id ?? lead.assigned_to ?? null;

  return {
    id: String(lead.id),
    stageId,
    statusKey: status,
    pipelineStageKey: pipelineStage,
    title: leadDisplayName(lead),
    location: lead.site_address ?? lead.area_estate ?? "—",
    owner: ownerName,
    ownerId,
    leadSourceId: lead.lead_source_id ?? null,
    nextActionDate:
      lead.next_follow_up_at?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    tag: getPipelineStageDisplayLabel({
      pipeline_stage: lead.pipeline_stage,
      status,
    }),
    company: pickOptional(resolveLeadListCompany(lead)),
    phone: pickOptional(resolveLeadListPhone(lead)),
    email: pickOptional(resolveLeadListEmail(lead)),
    source: lead.lead_source?.label ?? lead.source ?? undefined,
    notes:
      lead.notes ??
      (lead as import("@/lib/api/crm/types").ApiLeadDetail).requirement_description ??
      undefined,
    latitude: lead.latitude ?? null,
    longitude: lead.longitude ?? null,
    countySlug: resolveCountySlugFromLead(lead),
    subcounty: lead.subcounty ?? undefined,
  };
}

export function apiLeadToMapMarkers(leads: ApiLead[]): LeadMapMarker[] {
  const cards = leads.map(apiLeadToKanbanCard);
  return apiCardsToMapMarkers(cards);
}

export function apiCardsToMapMarkers(cards: LeadKanbanCard[]): LeadMapMarker[] {
  return cards.flatMap((card) => {
    const hasCoords =
      card.latitude != null &&
      card.longitude != null &&
      !Number.isNaN(card.latitude) &&
      !Number.isNaN(card.longitude);

    const coords: [number, number] | null = hasCoords
      ? [Number(card.latitude), Number(card.longitude)]
      : resolveCoordsForLocation(card.location, {
          countySlug: card.countySlug,
          subcounty: card.subcounty,
          latitude: card.latitude,
          longitude: card.longitude,
        }) ?? resolveCoordsForLocation(card.title);

    if (!coords) return [];

    return [
      {
        id: card.id,
        title: card.title,
        location: card.location,
        lat: coords[0],
        lng: coords[1],
        stage: card.tag,
        stageClassName: getLeadStatusBadgeClass(card.statusKey),
        owner: card.owner,
        company: card.company ?? "—",
      },
    ];
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
  return getKanbanStageLabel(stageId);
}
