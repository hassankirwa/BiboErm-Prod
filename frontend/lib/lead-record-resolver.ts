import { leadsListRows, type LeadListRow } from "@/lib/leads-list-data";
import {
  leadKanbanStages,
  type LeadKanbanCard,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";
import { statusToKanbanStage } from "@/lib/crm-lead-status";

const stageLabelToId: Record<string, LeadKanbanStageId> = {
  "New Lead": "new",
  Contacted: "contacted",
  Qualified: "qualified",
  "Site Visit Scheduled": "site_visit_scheduled",
  "Measurements Captured": "measurements_captured",
};

function listRowToCard(row: LeadListRow): LeadKanbanCard {
  const stageId =
    stageLabelToId[row.stage] ?? statusToKanbanStage(row.statusKey);

  return {
    id: row.id,
    stageId,
    statusKey: row.statusKey,
    title: row.leadName,
    location: "—",
    owner: row.owner,
    nextActionDate: new Date().toISOString().slice(0, 10),
    estimatedValue: 0,
    tag: row.stage,
    company: row.company,
    phone: row.phone,
    email: row.email,
    source: row.source,
  };
}

export function resolveLeadRecord(
  id: string,
  cards: LeadKanbanCard[],
): LeadKanbanCard | undefined {
  const fromStore = cards.find((c) => c.id === id);
  if (fromStore) return fromStore;

  const row = leadsListRows.find((r) => r.id === id);
  if (row) return listRowToCard(row);

  return undefined;
}

export function getStageLabel(stageId: LeadKanbanStageId): string {
  return leadKanbanStages.find((s) => s.id === stageId)?.label ?? stageId;
}
