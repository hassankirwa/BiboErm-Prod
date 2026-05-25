import type { ApiLead } from "@/lib/api/crm/types";
import { leadDisplayName } from "@/lib/api/crm/leads";
import { getUserInitials } from "@/lib/api/auth";
import type { LeadKanbanCard, LeadKanbanStageId } from "@/lib/leads-kanban-data";
import type { LeadListRow } from "@/lib/leads-list-data";
import type { LeadMapMarker } from "@/lib/leads-map-data";
import { resolveCoordsForLocation } from "@/lib/leads-map-data";

const stageLabels: Record<string, { label: string; className: string }> = {
  new: { label: "New Lead", className: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contacted", className: "bg-sky-100 text-sky-700" },
  interested: { label: "Interested", className: "bg-cyan-100 text-cyan-700" },
  qualified: { label: "Qualified", className: "bg-green-100 text-green-700" },
  site_visit_scheduled: {
    label: "Site Visit Scheduled",
    className: "bg-orange-100 text-orange-700",
  },
  measurements_captured: {
    label: "Measurements Captured",
    className: "bg-amber-100 text-amber-700",
  },
  quotation_sent: {
    label: "Quotation Sent",
    className: "bg-violet-100 text-violet-700",
  },
  negotiation: { label: "Negotiation", className: "bg-purple-100 text-purple-700" },
  converted: { label: "Converted", className: "bg-emerald-100 text-emerald-700" },
  not_reachable: { label: "Not Reachable", className: "bg-red-100 text-red-700" },
  unqualified: { label: "Unqualified", className: "bg-muted text-muted-foreground" },
};

function normalizeStageId(status: string | null | undefined): LeadKanbanStageId {
  const key = (status ?? "new").toLowerCase();
  const valid: LeadKanbanStageId[] = [
    "new",
    "contacted",
    "qualified",
    "site_visit_scheduled",
    "quotation_sent",
    "negotiation",
    "converted",
  ];
  if (valid.includes(key as LeadKanbanStageId)) {
    return key as LeadKanbanStageId;
  }
  if (key === "interested") return "contacted";
  if (key === "measurements_captured") return "site_visit_scheduled";
  return "new";
}

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
    source: lead.source ?? lead.lead_source?.label ?? "—",
    owner: ownerName,
    ownerInitials: getUserInitials(ownerName),
    activity: { type: "calendar" },
    statusKey: status,
  };
}

export function apiLeadToKanbanCard(lead: ApiLead): LeadKanbanCard {
  const ownerName =
    lead.lead_owner?.name ?? lead.assigned_sales_user?.name ?? "Unassigned";

  return {
    id: String(lead.id),
    stageId: normalizeStageId(lead.status),
    title: leadDisplayName(lead),
    location: lead.site_address ?? lead.area_estate ?? "—",
    owner: ownerName,
    nextActionDate:
      lead.next_follow_up_at?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    estimatedValue: Number(lead.estimated_value ?? lead.estimated_budget ?? 0),
    tag: stageLabels[(lead.status ?? "new").toLowerCase()]?.label ?? "New",
    company: lead.account_name ?? lead.company ?? undefined,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    source: lead.source ?? lead.lead_source?.label ?? undefined,
    notes: lead.requirement_description ?? undefined,
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
    date: card.nextActionDate,
    startTime: "09:00",
    endTime: "10:00",
    type: "follow_up" as const,
  }));
}
