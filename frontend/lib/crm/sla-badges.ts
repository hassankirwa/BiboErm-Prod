import type { LeadPipelineStage } from "@/lib/crm-lead-pipeline";

export type SlaBadgeVariant = "on_track" | "due_today" | "overdue";

/** Target days a lead should remain in each pipeline stage before SLA warning */
const STAGE_SLA_DAYS: Partial<Record<LeadPipelineStage, number>> = {
  new_lead: 1,
  contact_confirmed: 2,
  site_visit_required: 3,
  site_visit_assigned: 5,
  site_visit_in_progress: 2,
  measurements_submitted: 2,
  measurement_review: 2,
  design_required: 3,
  wincad_in_progress: 5,
  wincad_uploaded: 2,
  ready_for_quotation: 3,
  proforma_created: 2,
  proforma_sent: 5,
  client_accepted: 3,
  awaiting_deposit: 7,
};

export type SlaBadgeInfo = {
  variant: SlaBadgeVariant;
  label: string;
  className: string;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffCalendarDays(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function getStageSlaDays(stage: string | null | undefined): number | null {
  const key = (stage ?? "").toLowerCase() as LeadPipelineStage;
  return STAGE_SLA_DAYS[key] ?? null;
}

export function getSlaBadge(
  stage: string | null | undefined,
  stageEnteredAt: string | Date | null | undefined,
  now: Date = new Date(),
): SlaBadgeInfo | null {
  const slaDays = getStageSlaDays(stage);
  if (slaDays == null || !stageEnteredAt) return null;

  const entered =
    stageEnteredAt instanceof Date ? stageEnteredAt : new Date(stageEnteredAt);
  if (Number.isNaN(entered.getTime())) return null;

  const ageDays = diffCalendarDays(entered, now);
  const daysRemaining = slaDays - ageDays;

  if (daysRemaining < 0) {
    return {
      variant: "overdue",
      label: "Overdue",
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }

  if (daysRemaining === 0) {
    return {
      variant: "due_today",
      label: "Due today",
      className: "bg-amber-100 text-amber-900 border-amber-200",
    };
  }

  return {
    variant: "on_track",
    label: "On track",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
}
