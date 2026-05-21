import { leadsListRows, type LeadListRow } from "@/lib/leads-list-data";
import {
  leadKanbanCards,
  leadKanbanStages,
  type LeadKanbanCard,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";

const stageLabelToId: Record<string, LeadKanbanStageId> = {
  "New Lead": "new",
  Qualified: "qualified",
  "Site Visit Scheduled": "site_visit_scheduled",
  "Quotation Sent": "quotation_sent",
  Negotiation: "negotiation",
  Won: "negotiation",
};

function listRowToCard(row: LeadListRow): LeadKanbanCard {
  const kbMatch = leadKanbanCards.find(
    (c) =>
      c.title.toLowerCase() === row.leadName.toLowerCase() ||
      row.leadName.toLowerCase().includes(c.title.toLowerCase())
  );

  return {
    id: row.id,
    stageId: stageLabelToId[row.stage] ?? "new",
    title: row.leadName,
    location: kbMatch?.location ?? "Nairobi",
    owner: row.owner,
    nextActionDate: kbMatch?.nextActionDate ?? new Date().toISOString().slice(0, 10),
    estimatedValue: kbMatch?.estimatedValue ?? 0,
    tag: kbMatch?.tag ?? "New Inquiry",
    company: row.company,
    phone: row.phone,
    email: row.email,
    source: row.source,
    lastActivityType: kbMatch?.lastActivityType,
    notes: kbMatch?.notes,
  };
}

function mergeWithSeed(card: LeadKanbanCard): LeadKanbanCard {
  const seed = leadKanbanCards.find((c) => c.id === card.id);
  if (!seed) return card;
  return {
    ...seed,
    ...card,
    company: card.company ?? seed.company,
    phone: card.phone ?? seed.phone,
    email: card.email ?? seed.email,
    source: card.source ?? seed.source,
    notes: card.notes ?? seed.notes,
    lastActivityType: card.lastActivityType ?? seed.lastActivityType,
  };
}

export function resolveLeadRecord(
  id: string,
  cards: LeadKanbanCard[]
): LeadKanbanCard | undefined {
  const fromStore = cards.find((c) => c.id === id);
  if (fromStore) return mergeWithSeed(fromStore);

  const row = leadsListRows.find((r) => r.id === id);
  if (row) return listRowToCard(row);

  return undefined;
}

export function getStageLabel(stageId: LeadKanbanStageId): string {
  return leadKanbanStages.find((s) => s.id === stageId)?.label ?? stageId;
}
