/** Mirrors backend App\Enums\Crm\LeadPipelineStage */
export const LEAD_PIPELINE_STAGES = [
  "new_lead",
  "contact_confirmed",
  "account_provisioned",
  "site_visit_required",
  "site_visit_assigned",
  "site_visit_in_progress",
  "measurements_submitted",
  "measurement_review",
  "design_required",
  "wincad_in_progress",
  "wincad_uploaded",
  "ready_for_quotation",
  "proforma_created",
  "proforma_sent",
  "client_accepted",
  "awaiting_deposit",
  "deposit_paid",
  "deal_won",
  "project_created",
  "cold",
  "lost",
] as const;

export type LeadPipelineStage = (typeof LEAD_PIPELINE_STAGES)[number];

/** Kanban board columns for the modular lifecycle pipeline */
export type LeadKanbanStageId =
  | "new_lead"
  | "contact_confirmed"
  | "account_provisioned"
  | "site_visit_required"
  | "site_visit_assigned"
  | "measurements_submitted"
  | "design_required"
  | "ready_for_quotation"
  | "cold"
  | "lost";

export const KANBAN_PIPELINE_STAGE_IDS: LeadKanbanStageId[] = [
  "new_lead",
  "contact_confirmed",
  "account_provisioned",
  "site_visit_required",
  "site_visit_assigned",
  "measurements_submitted",
  "design_required",
  "ready_for_quotation",
  "cold",
  "lost",
];

export const TERMINAL_KANBAN_STAGE_IDS: LeadKanbanStageId[] = ["cold", "lost"];

export const PIPELINE_STAGE_LABELS: Record<LeadPipelineStage, string> = {
  new_lead: "New Lead",
  contact_confirmed: "Contact Confirmed",
  account_provisioned: "Account Provisioned",
  site_visit_required: "Site Visit Required",
  site_visit_assigned: "Site Visit Assigned",
  site_visit_in_progress: "Site Visit In Progress",
  measurements_submitted: "Measurements Submitted",
  measurement_review: "Measurement Review",
  design_required: "Design Required",
  wincad_in_progress: "WINCAD In Progress",
  wincad_uploaded: "WINCAD Uploaded",
  ready_for_quotation: "Ready for Quotation",
  proforma_created: "Proforma Created",
  proforma_sent: "Proforma Sent",
  client_accepted: "Client Accepted",
  awaiting_deposit: "Awaiting Deposit",
  deposit_paid: "Deposit Paid",
  deal_won: "Deal Won",
  project_created: "Project Created",
  cold: "Cold",
  lost: "Lost",
};

export const KANBAN_STAGE_LABELS: Record<LeadKanbanStageId, string> = {
  new_lead: "New Lead",
  contact_confirmed: "Contact Confirmed",
  account_provisioned: "Account Created",
  site_visit_required: "Site Visit Required",
  site_visit_assigned: "Site Visit Assigned",
  measurements_submitted: "Measurements Submitted",
  design_required: "Design Required",
  ready_for_quotation: "Ready for Quotation",
  cold: "Cold",
  lost: "Lost",
};

/** Map full pipeline stage → kanban column */
export const PIPELINE_STAGE_TO_KANBAN: Record<LeadPipelineStage, LeadKanbanStageId> = {
  new_lead: "new_lead",
  contact_confirmed: "contact_confirmed",
  account_provisioned: "account_provisioned",
  site_visit_required: "site_visit_required",
  site_visit_assigned: "site_visit_assigned",
  site_visit_in_progress: "site_visit_assigned",
  measurements_submitted: "measurements_submitted",
  measurement_review: "measurements_submitted",
  design_required: "design_required",
  wincad_in_progress: "design_required",
  wincad_uploaded: "design_required",
  ready_for_quotation: "ready_for_quotation",
  proforma_created: "ready_for_quotation",
  proforma_sent: "ready_for_quotation",
  client_accepted: "ready_for_quotation",
  awaiting_deposit: "ready_for_quotation",
  deposit_paid: "ready_for_quotation",
  deal_won: "ready_for_quotation",
  project_created: "ready_for_quotation",
  cold: "cold",
  lost: "lost",
};

/** Legacy LeadStatus → pipeline stage (fallback when pipeline_stage is null) */
export const LEGACY_STATUS_TO_PIPELINE_STAGE: Record<string, LeadPipelineStage> = {
  new: "new_lead",
  contacted: "contact_confirmed",
  interested: "contact_confirmed",
  account_created: "account_provisioned",
  not_reachable: "cold",
  unqualified: "lost",
  qualified: "site_visit_required",
  site_visit_required: "site_visit_required",
  site_visit_scheduled: "site_visit_assigned",
  measurements_captured: "measurements_submitted",
  converted: "project_created",
};

/** Kanban column → closest legacy status for PATCH /status compatibility */
export const KANBAN_STAGE_TO_LEGACY_STATUS: Record<LeadKanbanStageId, string> = {
  new_lead: "new",
  contact_confirmed: "contacted",
  account_provisioned: "account_created",
  site_visit_required: "site_visit_required",
  site_visit_assigned: "site_visit_scheduled",
  measurements_submitted: "measurements_captured",
  design_required: "measurements_captured",
  ready_for_quotation: "converted",
  cold: "not_reachable",
  lost: "unqualified",
};

/** Ordered stages shown in the lead detail pipeline tracker */
export const PIPELINE_TRACKER_STAGES: LeadKanbanStageId[] = [
  "new_lead",
  "contact_confirmed",
  "account_provisioned",
  "site_visit_required",
  "site_visit_assigned",
  "measurements_submitted",
  "design_required",
  "ready_for_quotation",
];

export type PipelineNextAction = {
  label: string;
  description?: string;
  href?: string;
};

const NEXT_ACTIONS: Partial<Record<LeadPipelineStage, PipelineNextAction>> = {
  new_lead: {
    label: "Contact lead",
    description: "Confirm contact details and initial interest.",
  },
  contact_confirmed: {
    label: "Create account",
    description: "Provision a CRM account before scheduling measurements.",
  },
  account_provisioned: {
    label: "Schedule site visit",
    description: "Book a field visit for measurements or inspection.",
  },
  site_visit_required: {
    label: "Assign site visit",
    description: "Schedule and assign a field officer.",
  },
  site_visit_assigned: {
    label: "Monitor site visit",
    description: "Ensure the visit is completed on schedule.",
    href: "/site-ops/visits",
  },
  site_visit_in_progress: {
    label: "Complete measurements",
    description: "Field officer is capturing site data.",
  },
  measurements_submitted: {
    label: "Review measurements",
    description: "Approve submitted measurements.",
    href: "/site-ops/measurements",
  },
  measurement_review: {
    label: "Approve measurement report",
    description: "Review and approve the measurement package.",
    href: "/site-ops/measurements",
  },
  design_required: {
    label: "Assign designer",
    description: "Pick up the design job and download measurements.",
    href: "/design/jobs",
  },
  wincad_in_progress: {
    label: "Upload WINCAD files",
    description: "Complete design output for review.",
    href: "/design/uploads",
  },
  wincad_uploaded: {
    label: "Review design",
    description: "Approve design before quotation.",
    href: "/design/review",
  },
  ready_for_quotation: {
    label: "Create proforma quotation",
    description: "Prepare and send the proforma to the client.",
    href: "/quotation/proforma",
  },
  proforma_created: {
    label: "Send proforma quotation",
    description: "Share the proforma with the client.",
    href: "/quotation/proforma",
  },
  proforma_sent: {
    label: "Follow up with client",
    description: "Track client response to the proforma.",
  },
  client_accepted: {
    label: "Record deposit",
    description: "Collect deposit and advance the deal.",
  },
  awaiting_deposit: {
    label: "Confirm deposit payment",
    description: "Verify deposit before project creation.",
  },
  deposit_paid: {
    label: "Create project",
    description: "Convert won deal into a production project.",
  },
};

export function isTerminalPipelineStage(stage: string | null | undefined): boolean {
  const key = (stage ?? "").toLowerCase();
  return key === "cold" || key === "lost" || key === "project_created";
}

export function isTerminalKanbanStage(stageId: LeadKanbanStageId): boolean {
  return TERMINAL_KANBAN_STAGE_IDS.includes(stageId);
}

export function resolveLeadPipelineStage(input: {
  pipeline_stage?: string | null;
  status?: string | null;
}): LeadPipelineStage {
  const fromPipeline = (input.pipeline_stage ?? "").toLowerCase();
  if (fromPipeline && LEAD_PIPELINE_STAGES.includes(fromPipeline as LeadPipelineStage)) {
    return fromPipeline as LeadPipelineStage;
  }

  const fromStatus = (input.status ?? "new").toLowerCase();
  return LEGACY_STATUS_TO_PIPELINE_STAGE[fromStatus] ?? "new_lead";
}

export function pipelineStageToKanban(
  stage: LeadPipelineStage | string | null | undefined,
): LeadKanbanStageId {
  const key = (stage ?? "new_lead").toLowerCase() as LeadPipelineStage;
  return PIPELINE_STAGE_TO_KANBAN[key] ?? "new_lead";
}

export function resolveLeadKanbanStage(input: {
  pipeline_stage?: string | null;
  status?: string | null;
}): LeadKanbanStageId {
  return pipelineStageToKanban(resolveLeadPipelineStage(input));
}

export function getPipelineStageLabel(stage: string | null | undefined): string {
  const key = (stage ?? "new_lead").toLowerCase() as LeadPipelineStage;
  return PIPELINE_STAGE_LABELS[key] ?? key.replace(/_/g, " ");
}

export function getKanbanStageLabel(stageId: LeadKanbanStageId): string {
  return KANBAN_STAGE_LABELS[stageId] ?? stageId.replace(/_/g, " ");
}

export function getNextPipelineAction(
  stage: LeadPipelineStage | string | null | undefined,
): PipelineNextAction | null {
  const key = (stage ?? "new_lead").toLowerCase() as LeadPipelineStage;
  if (isTerminalPipelineStage(key)) return null;
  return NEXT_ACTIONS[key] ?? null;
}

export function kanbanStageToLegacyStatus(stageId: LeadKanbanStageId): string {
  return KANBAN_STAGE_TO_LEGACY_STATUS[stageId];
}
