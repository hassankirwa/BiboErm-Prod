import type { LeadKanbanStageId } from "@/lib/crm-lead-pipeline";
import {
  getKanbanStageLabel,
  getPipelineStageLabel,
  kanbanStageToLegacyStatus,
  LEGACY_STATUS_TO_PIPELINE_STAGE,
  pipelineStageToKanban,
  resolveLeadKanbanStage,
  resolveLeadPipelineStage,
  type LeadPipelineStage,
} from "@/lib/crm-lead-pipeline";

export type { LeadPipelineStage } from "@/lib/crm-lead-pipeline";

/** Backend LeadStatus values — v2 pipeline + legacy statuses for existing records */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "account_created",
  "not_reachable",
  "unqualified",
  "qualified",
  "site_visit_required",
  "site_visit_scheduled",
  "measurements_captured",
  "converted",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const KANBAN_STAGE_TO_STATUS: Record<LeadKanbanStageId, LeadStatus> = {
  new_lead: "new",
  contact_confirmed: "contacted",
  site_visit_required: "site_visit_required",
  site_visit_assigned: "site_visit_scheduled",
  measurements_submitted: "measurements_captured",
  design_required: "measurements_captured",
  ready_for_quotation: "converted",
  cold: "not_reachable",
  lost: "unqualified",
};

export const STATUS_TO_KANBAN_STAGE: Record<string, LeadKanbanStageId> = {
  new: "new_lead",
  contacted: "contact_confirmed",
  interested: "contact_confirmed",
  account_created: "site_visit_required",
  not_reachable: "cold",
  unqualified: "lost",
  qualified: "site_visit_required",
  site_visit_required: "site_visit_required",
  site_visit_scheduled: "site_visit_assigned",
  measurements_captured: "measurements_submitted",
  converted: "ready_for_quotation",
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
  qualified: "Qualified (legacy)",
  site_visit_required: "Site Visit Required (legacy)",
  site_visit_scheduled: "Site Visit Scheduled (legacy)",
  measurements_captured: "Measurements Captured (legacy)",
  converted: "Converted (legacy)",
};

export const ACTIVE_LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "account_created",
  "not_reachable",
  "unqualified",
] as const;

export const LEGACY_LEAD_STATUSES = [
  "qualified",
  "site_visit_required",
  "site_visit_scheduled",
  "measurements_captured",
  "converted",
] as const;

export const LEAD_STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-sky-100 text-sky-800 border-sky-200",
  interested: "bg-cyan-100 text-cyan-800 border-cyan-200",
  account_created: "bg-emerald-100 text-emerald-800 border-emerald-200",
  not_reachable: "bg-slate-100 text-slate-700 border-slate-200",
  unqualified: "bg-red-100 text-red-800 border-red-200",
  qualified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  site_visit_required: "bg-amber-100 text-amber-800 border-amber-200",
  site_visit_scheduled: "bg-orange-100 text-orange-800 border-orange-200",
  measurements_captured: "bg-amber-100 text-amber-900 border-amber-200",
  converted: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function getLeadStatusLabel(status: string | null | undefined): string {
  const key = (status ?? "new").toLowerCase();
  return LEAD_STATUS_LABELS[key] ?? key.replace(/_/g, " ");
}

export function getLeadStatusBadgeClass(status: string | null | undefined): string {
  const key = (status ?? "new").toLowerCase();
  return (
    LEAD_STATUS_BADGE_CLASS[key] ??
    "bg-muted text-muted-foreground border-border"
  );
}

export function isLegacyLeadStatus(status: string | null | undefined): boolean {
  const key = (status ?? "").toLowerCase();
  return (LEGACY_LEAD_STATUSES as readonly string[]).includes(key);
}

export function showLeadStatusOnKanbanCard(
  statusKey: string,
  pipelineStageKey?: string | null,
): boolean {
  const status = statusKey.toLowerCase();
  const pipelineStage = resolveLeadPipelineStage({
    pipeline_stage: pipelineStageKey,
    status,
  });
  const kanbanFromPipeline = pipelineStageToKanban(pipelineStage);
  const kanbanFromStatus = statusToKanbanStage(status);
  return kanbanFromPipeline !== kanbanFromStatus || isLegacyLeadStatus(status);
}

export function resolvePipelineStage(input: {
  pipeline_stage?: string | null;
  status?: string | null;
}): LeadPipelineStage {
  return resolveLeadPipelineStage(input);
}

export function statusToKanbanStage(
  status: string | null | undefined,
  pipelineStage?: string | null,
): LeadKanbanStageId {
  if (pipelineStage) {
    return resolveLeadKanbanStage({ pipeline_stage: pipelineStage, status });
  }
  const key = (status ?? "new").toLowerCase();
  const fromPipeline = LEGACY_STATUS_TO_PIPELINE_STAGE[key];
  if (fromPipeline) {
    return pipelineStageToKanban(fromPipeline);
  }
  return STATUS_TO_KANBAN_STAGE[key] ?? "new_lead";
}

export function kanbanStageToStatus(stageId: LeadKanbanStageId): LeadStatus {
  return KANBAN_STAGE_TO_STATUS[stageId];
}

export function kanbanStageToApiStatus(stageId: LeadKanbanStageId): string {
  return kanbanStageToLegacyStatus(stageId);
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

export function canProvisionAccountFromLead(
  status: string | null | undefined,
  hasLinkedAccount: boolean,
): boolean {
  if (hasLinkedAccount) return false;
  const normalized = (status ?? "new").toLowerCase();
  return normalized === "interested" || isLeadQualifiedForAccount(normalized);
}

const SENT_QUOTATION_STATUSES = new Set([
  "sent",
  "revision_requested",
  "revised",
  "accepted",
]);

export function hasApprovedSiteVisit(
  siteVisits: { status?: string | null }[] | null | undefined,
): boolean {
  return (siteVisits ?? []).some(
    (visit) => (visit.status ?? "").toLowerCase() === "approved",
  );
}

export function hasQuotationSentToClient(
  quotation: { status?: string | null } | null | undefined,
): boolean {
  if (!quotation?.status) return false;
  return SENT_QUOTATION_STATUSES.has(quotation.status.toLowerCase());
}

export type DealDepositFields = {
  payment_status?: string | null;
  deposit_required_amount?: string | number | null;
  deposit_paid_amount?: string | number | null;
  deposit_amount?: string | number | null;
};

export function hasRecordedDeposit(
  deal: DealDepositFields | null | undefined,
): boolean {
  if (!deal) return false;
  if (
    deal.payment_status === "deposit_met" ||
    deal.payment_status === "partial"
  ) {
    return true;
  }
  const paid =
    parseFloat(String(deal.deposit_paid_amount ?? deal.deposit_amount ?? 0)) ||
    0;
  return paid > 0;
}

export function depositRequirementMet(
  deal: DealDepositFields | null | undefined,
): boolean {
  if (!deal) return false;
  if (deal.payment_status === "deposit_met") return true;
  const required =
    parseFloat(String(deal.deposit_required_amount ?? 0)) || 0;
  const paid =
    parseFloat(String(deal.deposit_paid_amount ?? deal.deposit_amount ?? 0)) ||
    0;
  if (required <= 0) return paid > 0;
  return paid >= required;
}

export function dealIsWon(
  deal: { status?: string | null; stage?: string | null } | null | undefined,
): boolean {
  if (!deal) return false;
  return (
    deal.status === "won" ||
    deal.stage === "won" ||
    deal.stage === "project_created"
  );
}

export type CommercialConvertInput = {
  hasLinkedAccount: boolean;
  hasDeal: boolean;
  hasRecordedDeposit: boolean;
  hasApprovedSiteVisit: boolean;
  hasSentQuotation: boolean;
  dealWon?: boolean;
};

function commercialPrerequisitesMet(input: CommercialConvertInput): boolean {
  return (
    input.hasLinkedAccount &&
    input.hasApprovedSiteVisit &&
    input.hasSentQuotation
  );
}

/**
 * Header / convert flow: record deposit and create the deal in one step.
 * Only when no deal exists yet and no deposit has been recorded.
 */
export function canRecordDepositAndCreateDeal(
  input: CommercialConvertInput,
): boolean {
  if (!commercialPrerequisitesMet(input)) return false;
  if (input.hasRecordedDeposit) return false;
  if (input.hasDeal) return false;
  return true;
}

/**
 * After deposit was recorded on the quotation deal, finalize conversion
 * (accept quotation, mark won, link lead) without recording payment again.
 */
export function canCreateDealAfterDeposit(
  input: CommercialConvertInput,
): boolean {
  if (!commercialPrerequisitesMet(input)) return false;
  if (!input.hasRecordedDeposit) return false;
  if (!input.hasDeal) return false;
  if (input.dealWon) return false;
  return true;
}

/** @deprecated Use canRecordDepositAndCreateDeal or canCreateDealAfterDeposit */
export function canCommercialConvertLead(input: CommercialConvertInput): boolean {
  return (
    canRecordDepositAndCreateDeal(input) || canCreateDealAfterDeposit(input)
  );
}

export function canKanbanMove(
  currentStatus: string,
  targetStageId: LeadKanbanStageId,
  pipelineStage?: string | null,
): boolean {
  const currentKanban = statusToKanbanStage(currentStatus, pipelineStage);
  if (currentKanban === targetStageId) return true;

  const targetStatus = kanbanStageToStatus(targetStageId);
  const current = currentStatus.toLowerCase();
  if (current === targetStatus) return true;

  if (targetStageId === "cold" || targetStageId === "lost") {
    return true;
  }

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

export function getPipelineStageDisplayLabel(input: {
  pipeline_stage?: string | null;
  status?: string | null;
}): string {
  const stage = resolveLeadPipelineStage(input);
  if (input.pipeline_stage) {
    return getPipelineStageLabel(stage);
  }
  return getKanbanStageLabel(statusToKanbanStage(input.status, input.pipeline_stage));
}
