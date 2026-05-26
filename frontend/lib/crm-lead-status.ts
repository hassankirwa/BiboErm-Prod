import type { LeadKanbanStageId } from "@/lib/leads-kanban-data";

/** Backend LeadStatus values from App\Enums\Crm\LeadStatus */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "not_reachable",
  "unqualified",
  "qualified",
  "site_visit_required",
  "site_visit_scheduled",
  "measurements_captured",
  "converted",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Kanban column ids map to a primary backend status for drag/drop. */
export const KANBAN_STAGE_TO_STATUS: Record<LeadKanbanStageId, LeadStatus> = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  site_visit_scheduled: "site_visit_scheduled",
  measurements_captured: "measurements_captured",
};

/** Group backend statuses into kanban columns for display. */
export const STATUS_TO_KANBAN_STAGE: Record<string, LeadKanbanStageId> = {
  new: "new",
  contacted: "contacted",
  interested: "contacted",
  not_reachable: "new",
  unqualified: "new",
  qualified: "qualified",
  site_visit_required: "qualified",
  site_visit_scheduled: "site_visit_scheduled",
  measurements_captured: "measurements_captured",
  converted: "measurements_captured",
};

/** Mirrors backend LeadStageService transitions. */
export const LEAD_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["contacted", "not_reachable", "unqualified"],
  contacted: ["interested", "not_reachable", "unqualified"],
  interested: ["qualified", "unqualified"],
  qualified: ["site_visit_required", "site_visit_scheduled", "converted"],
  site_visit_required: ["site_visit_scheduled"],
  site_visit_scheduled: ["measurements_captured", "converted"],
  measurements_captured: ["converted"],
};

export function statusToKanbanStage(status: string | null | undefined): LeadKanbanStageId {
  const key = (status ?? "new").toLowerCase();
  return STATUS_TO_KANBAN_STAGE[key] ?? "new";
}

export function kanbanStageToStatus(stageId: LeadKanbanStageId): LeadStatus {
  return KANBAN_STAGE_TO_STATUS[stageId];
}

export function isValidLeadStatusTransition(
  fromStatus: string,
  toStatus: string,
): boolean {
  const from = fromStatus.toLowerCase();
  const to = toStatus.toLowerCase();
  if (from === to) return true;
  if (from === "converted") return false;
  const allowed = LEAD_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function isLeadQualifiedForAccount(status: string | null | undefined): boolean {
  const normalized = (status ?? "new").toLowerCase();
  return [
    "qualified",
    "site_visit_required",
    "site_visit_scheduled",
    "measurements_captured",
    "converted",
  ].includes(normalized);
}

export function canKanbanMove(
  currentStatus: string,
  targetStageId: LeadKanbanStageId,
): boolean {
  const targetStatus = kanbanStageToStatus(targetStageId);
  const current = currentStatus.toLowerCase();
  if (current === targetStatus) return true;
  if (statusToKanbanStage(current) === targetStageId) return true;
  return isValidLeadStatusTransition(current, targetStatus);
}
