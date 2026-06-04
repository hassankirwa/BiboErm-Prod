import type { ApiLead } from "@/lib/api/crm/types";
import { leadDisplayName } from "@/lib/api/crm/leads";
import { getUserInitials } from "@/lib/api/auth";
import { LEAD_STATUS_LABELS, statusToKanbanStage } from "@/lib/crm-lead-status";
import type { LeadKanbanCard, LeadKanbanStageId } from "@/lib/leads-kanban-data";
import type { LeadListRow } from "@/lib/leads-list-data";
import type { LeadMapMarker } from "@/lib/leads-map-data";
import { resolveCoordsForLocation } from "@/lib/leads-map-data";

const stageLabels: Record<string, { label: string; className: string }> = {
  new: { label: "New Lead", className: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contacted", className: "bg-sky-100 text-sky-700" },
  interested: { label: "Interested", className: "bg-cyan-100 text-cyan-700" },
  qualified: { label: "Qualified", className: "bg-green-100 text-green-700" },
  site_visit_required: {
    label: "Site Visit Required",
    className: "bg-orange-100 text-orange-700",
  },
  site_visit_scheduled: {
    label: "Site Visit Scheduled",
    className: "bg-orange-100 text-orange-700",
  },
  measurements_captured: {
    label: "Measurements Captured",
    className: "bg-amber-100 text-amber-700",
  },
  converted: { label: "Converted", className: "bg-emerald-100 text-emerald-700" },
  not_reachable: { label: "Not Reachable", className: "bg-red-100 text-red-700" },
  unqualified: { label: "Unqualified", className: "bg-muted text-muted-foreground" },
};

export function apiLeadToListRow(lead: ApiLead): LeadListRow {
  const status = (lead.status ?? "new").toLowerCase();
  const stage = stageLabels[status] ?? stageLabels.new;
  const ownerName =
    lead.lead_owner?.name ?? lead.assigned_sales_user?.name ?? "Unassigned";

  return {
    id: String(lead.id),
    leadName: leadDisplayName(lead),
    company: lead.account_name ?? lead.company ?? "—",
    email: lead.email ?? "—",
    phone: lead.phone ?? "—",
    stage: stage.label,
    stageClassName: stage.className,
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
    tag: stageLabels[status]?.label ?? "New",
    company: lead.account_name ?? lead.company ?? undefined,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
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
  }));
}

export function getLeadStageLabel(stageId: LeadKanbanStageId): string {
  return LEAD_STATUS_LABELS[stageId] ?? stageId;
}
