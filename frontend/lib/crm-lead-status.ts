import type { LeadKanbanStageId } from "@/lib/leads-kanban-data";

/** Backend LeadStatus values — v2 pipeline + legacy statuses for existing records */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "account_created",
  "not_reachable",
  "unqualified",
  // Legacy v1 (read-only display)
  "qualified",
  "site_visit_required",
  "site_visit_scheduled",
  "measurements_captured",
  "converted",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const KANBAN_STAGE_TO_STATUS: Record<LeadKanbanStageId, LeadStatus> = {
  new: "new",
  contacted: "contacted",
  interested: "interested",
  account_created: "account_created",
  not_reachable: "not_reachable",
  unqualified: "unqualified",
};

export const STATUS_TO_KANBAN_STAGE: Record<string, LeadKanbanStageId> = {
  new: "new",
  contacted: "contacted",
  interested: "interested",
  account_created: "account_created",
  not_reachable: "not_reachable",
  unqualified: "unqualified",
  qualified: "account_created",
  site_visit_required: "account_created",
  site_visit_scheduled: "account_created",
  measurements_captured: "account_created",
  converted: "account_created",
};

/** Mirrors backend LeadStageService transitions (v2). */
export const LEAD_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["contacted", "not_reachable", "unqualified"],
  contacted: ["interested", "not_reachable", "unqualified"],
  interested: ["unqualified"],
  account_created: [],
  not_reachable: [],
  unqualified: [],
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New Lead",
  contacted: "Contacted",
  interested: "Interested",
  account_created: "Account Created",
  not_reachable: "Not Reachable",
  unqualified: "Unqualified",
  qualified: "Qualified",
  site_visit_required: "Site Visit Required",
  site_visit_scheduled: "Site Visit Scheduled",
  measurements_captured: "Measurements Captured",
  converted: "Converted",
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
  if (from === "account_created" || from === "converted") return false;
  const allowed = LEAD_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function isLeadQualifiedForAccount(status: string | null | undefined): boolean {
  const normalized = (status ?? "new").toLowerCase();
  return [
    "interested",
    "account_created",
    "converted",
    "qualified",
    "site_visit_required",
    "site_visit_scheduled",
    "measurements_captured",
  ].includes(normalized);
}

export function hasProvisionedAccount(status: string | null | undefined): boolean {
  const normalized = (status ?? "new").toLowerCase();
  return ["account_created", "converted"].includes(normalized);
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

export function getNextLeadStatus(status: string | null | undefined): LeadStatus | null {
  const normalized = (status ?? "new").toLowerCase();
  const allowed = LEAD_STATUS_TRANSITIONS[normalized] ?? [];
  const next = allowed.find(
    (candidate) => candidate !== "not_reachable" && candidate !== "unqualified",
  );

  return next && LEAD_STATUSES.includes(next as LeadStatus)
    ? (next as LeadStatus)
    : null;
}

export function getNextLeadStatusAction(status: string | null | undefined): {
  status: LeadStatus;
  label: string;
} | null {
  const next = getNextLeadStatus(status);

  if (!next) return null;

  return {
    status: next,
    label: `Advance to ${LEAD_STATUS_LABELS[next] ?? next}`,
  };
}
