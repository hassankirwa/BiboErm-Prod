import type { LeadKanbanStageId } from "@/lib/crm-lead-pipeline";

export type { LeadKanbanStageId } from "@/lib/crm-lead-pipeline";

export type LeadActivityType =
  | "create_task"
  | "follow_up"
  | "schedule_meeting"
  | "schedule_call";

export type LeadKanbanCard = {
  id: string;
  stageId: LeadKanbanStageId;
  statusKey: string;
  pipelineStageKey: string;
  title: string;
  location: string;
  owner: string;
  ownerId?: number | null;
  leadSourceId?: number | null;
  nextActionDate: string;
  tag: string;
  lastActivityType?: LeadActivityType | null;
  company?: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  countySlug?: string;
  subcounty?: string;
};

export const leadActivityTypes: {
  id: LeadActivityType;
  label: string;
}[] = [
  { id: "create_task", label: "Create task" },
  { id: "schedule_meeting", label: "Schedule a meeting" },
  { id: "schedule_call", label: "Schedule a call" },
];

export type LeadKanbanStageConfig = {
  id: LeadKanbanStageId;
  label: string;
  description: string;
  headerBg: string;
  headerBorder: string;
  countBadge: string;
  tagClass: string;
  addBtnClass: string;
  /** Closed / terminal columns — no new leads added here */
  terminal?: boolean;
};

/** Modular lifecycle pipeline kanban columns */
export const leadKanbanStages: LeadKanbanStageConfig[] = [
  {
    id: "new_lead",
    label: "New Lead",
    description: "Captured, awaiting first contact",
    headerBg: "bg-blue-50",
    headerBorder: "border-blue-200",
    countBadge: "bg-blue-600 text-white",
    tagClass: "bg-blue-100 text-blue-800",
    addBtnClass: "text-blue-700 hover:bg-blue-50",
  },
  {
    id: "contact_confirmed",
    label: "Contact Confirmed",
    description: "Client reached — qualify and plan next step",
    headerBg: "bg-sky-50",
    headerBorder: "border-sky-200",
    countBadge: "bg-sky-600 text-white",
    tagClass: "bg-sky-100 text-sky-800",
    addBtnClass: "text-sky-700 hover:bg-sky-50",
  },
  {
    id: "account_provisioned",
    label: "Account Created",
    description: "CRM account ready — schedule site measurements",
    headerBg: "bg-teal-50",
    headerBorder: "border-teal-200",
    countBadge: "bg-teal-600 text-white",
    tagClass: "bg-teal-100 text-teal-800",
    addBtnClass: "text-teal-700 hover:bg-teal-50",
  },
  {
    id: "site_visit_required",
    label: "Site Visit Required",
    description: "Measurements or inspection needed",
    headerBg: "bg-cyan-50",
    headerBorder: "border-cyan-200",
    countBadge: "bg-cyan-600 text-white",
    tagClass: "bg-cyan-100 text-cyan-800",
    addBtnClass: "text-cyan-700 hover:bg-cyan-50",
  },
  {
    id: "site_visit_assigned",
    label: "Site Visit Assigned",
    description: "Field visit scheduled or in progress",
    headerBg: "bg-indigo-50",
    headerBorder: "border-indigo-200",
    countBadge: "bg-indigo-600 text-white",
    tagClass: "bg-indigo-100 text-indigo-800",
    addBtnClass: "text-indigo-700 hover:bg-indigo-50",
  },
  {
    id: "measurements_submitted",
    label: "Measurements Submitted",
    description: "Awaiting measurement review",
    headerBg: "bg-amber-50",
    headerBorder: "border-amber-200",
    countBadge: "bg-amber-600 text-white",
    tagClass: "bg-amber-100 text-amber-800",
    addBtnClass: "text-amber-700 hover:bg-amber-50",
  },
  {
    id: "design_required",
    label: "Design Required",
    description: "WINCAD design in progress",
    headerBg: "bg-violet-50",
    headerBorder: "border-violet-200",
    countBadge: "bg-violet-600 text-white",
    tagClass: "bg-violet-100 text-violet-800",
    addBtnClass: "text-violet-700 hover:bg-violet-50",
  },
  {
    id: "ready_for_quotation",
    label: "Ready for Quotation",
    description: "Design approved — prepare proforma",
    headerBg: "bg-emerald-50",
    headerBorder: "border-emerald-200",
    countBadge: "bg-emerald-600 text-white",
    tagClass: "bg-emerald-100 text-emerald-800",
    addBtnClass: "text-emerald-700 hover:bg-emerald-50",
  },
  {
    id: "won",
    label: "Won",
    description: "Deposit recorded / deal won",
    headerBg: "bg-green-50",
    headerBorder: "border-green-200",
    countBadge: "bg-green-700 text-white",
    tagClass: "bg-green-100 text-green-900",
    addBtnClass: "text-green-800 hover:bg-green-50",
    terminal: true,
  },
  {
    id: "cold",
    label: "Cold",
    description: "Not progressing — revisit later",
    headerBg: "bg-slate-50",
    headerBorder: "border-slate-200",
    countBadge: "bg-slate-600 text-white",
    tagClass: "bg-slate-100 text-slate-800",
    addBtnClass: "text-slate-700 hover:bg-slate-50",
    terminal: true,
  },
  {
    id: "lost",
    label: "Lost",
    description: "Closed without a win",
    headerBg: "bg-red-50",
    headerBorder: "border-red-200",
    countBadge: "bg-red-600 text-white",
    tagClass: "bg-red-100 text-red-800",
    addBtnClass: "text-red-700 hover:bg-red-50",
    terminal: true,
  },
];

/** Demo cards removed — kanban uses live API data. */
export const leadKanbanCards: LeadKanbanCard[] = [];

export function formatKes(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `KES ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function formatKesFull(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
