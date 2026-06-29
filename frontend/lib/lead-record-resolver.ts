import { leadsListRows, type LeadListRow } from "@/lib/leads-list-data";
import {
  leadKanbanStages,
  type LeadKanbanCard,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";
import { statusToKanbanStage, resolvePipelineStage } from "@/lib/crm-lead-status";

const stageLabelToId: Record<string, LeadKanbanStageId> = {
  "New Lead": "new_lead",
  "Contact Confirmed": "contact_confirmed",
  "Site Visit Required": "site_visit_required",
  "Site Visit Assigned": "site_visit_assigned",
  "Measurements Submitted": "measurements_submitted",
  "Design Required": "design_required",
  "Ready for Quotation": "ready_for_quotation",
  Cold: "cold",
  Lost: "lost",
  Contacted: "contact_confirmed",
  Interested: "contact_confirmed",
  "Account Created": "site_visit_required",
  "Not Reachable": "cold",
  Unqualified: "lost",
};

function listRowToCard(row: LeadListRow): LeadKanbanCard {
  const stageId =
    stageLabelToId[row.stage] ?? statusToKanbanStage(row.statusKey);

  return {
    id: row.id,
    stageId,
    statusKey: row.statusKey,
    pipelineStageKey: resolvePipelineStage({ status: row.statusKey }),
    title: row.leadName,
    location: "—",
    owner: row.owner,
    nextActionDate: new Date().toISOString().slice(0, 10),
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
