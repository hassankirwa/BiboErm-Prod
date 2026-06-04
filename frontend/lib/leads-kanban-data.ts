export type LeadKanbanStageId =
  | "new"
  | "contacted"
  | "interested"
  | "not_reachable"
  | "unqualified"
  | "qualified"
  | "site_visit_required"
  | "site_visit_scheduled"
  | "measurements_captured"
  | "converted";

export type LeadActivityType =
  | "create_task"
  | "schedule_meeting"
  | "schedule_call";

export type LeadKanbanCard = {
  id: string;
  stageId: LeadKanbanStageId;
  statusKey: string;
  title: string;
  location: string;
  owner: string;
  ownerId?: number | null;
  leadSourceId?: number | null;
  nextActionDate: string;
  estimatedValue: number;
  tag: string;
  lastActivityType?: LeadActivityType | null;
  company?: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export const leadActivityTypes: {
  id: LeadActivityType;
  label: string;
}[] = [
  { id: "create_task", label: "Create task" },
  { id: "schedule_meeting", label: "Schedule a meeting" },
  { id: "schedule_call", label: "Schedule a call" },
];

export const leadKanbanStages: {
  id: LeadKanbanStageId;
  label: string;
  headerBg: string;
  headerBorder: string;
  countBadge: string;
  tagClass: string;
  addBtnClass: string;
}[] = [
  {
    id: "new",
    label: "New Lead",
    headerBg: "bg-blue-50",
    headerBorder: "border-blue-200",
    countBadge: "bg-blue-600 text-white",
    tagClass: "bg-blue-100 text-blue-800",
    addBtnClass: "text-blue-700 hover:bg-blue-50",
  },
  {
    id: "contacted",
    label: "Contacted",
    headerBg: "bg-sky-50",
    headerBorder: "border-sky-200",
    countBadge: "bg-sky-600 text-white",
    tagClass: "bg-sky-100 text-sky-800",
    addBtnClass: "text-sky-700 hover:bg-sky-50",
  },
  {
    id: "interested",
    label: "Interested",
    headerBg: "bg-cyan-50",
    headerBorder: "border-cyan-200",
    countBadge: "bg-cyan-600 text-white",
    tagClass: "bg-cyan-100 text-cyan-800",
    addBtnClass: "text-cyan-700 hover:bg-cyan-50",
  },
  {
    id: "qualified",
    label: "Qualified",
    headerBg: "bg-teal-50",
    headerBorder: "border-teal-200",
    countBadge: "bg-teal-600 text-white",
    tagClass: "bg-teal-100 text-teal-800",
    addBtnClass: "text-teal-700 hover:bg-teal-50",
  },
  {
    id: "site_visit_required",
    label: "Site Visit Required",
    headerBg: "bg-orange-50",
    headerBorder: "border-orange-200",
    countBadge: "bg-orange-600 text-white",
    tagClass: "bg-orange-100 text-orange-800",
    addBtnClass: "text-orange-700 hover:bg-orange-50",
  },
  {
    id: "site_visit_scheduled",
    label: "Site Visit Scheduled",
    headerBg: "bg-green-50",
    headerBorder: "border-green-200",
    countBadge: "bg-green-600 text-white",
    tagClass: "bg-green-100 text-green-800",
    addBtnClass: "text-green-700 hover:bg-green-50",
  },
  {
    id: "measurements_captured",
    label: "Measurements Captured",
    headerBg: "bg-amber-50",
    headerBorder: "border-amber-200",
    countBadge: "bg-amber-600 text-white",
    tagClass: "bg-amber-100 text-amber-800",
    addBtnClass: "text-amber-700 hover:bg-amber-50",
  },
  {
    id: "converted",
    label: "Converted",
    headerBg: "bg-emerald-50",
    headerBorder: "border-emerald-200",
    countBadge: "bg-emerald-600 text-white",
    tagClass: "bg-emerald-100 text-emerald-800",
    addBtnClass: "text-emerald-700 hover:bg-emerald-50",
  },
  {
    id: "not_reachable",
    label: "Not Reachable",
    headerBg: "bg-slate-50",
    headerBorder: "border-slate-200",
    countBadge: "bg-slate-600 text-white",
    tagClass: "bg-slate-100 text-slate-800",
    addBtnClass: "text-slate-700 hover:bg-slate-50",
  },
  {
    id: "unqualified",
    label: "Unqualified",
    headerBg: "bg-red-50",
    headerBorder: "border-red-200",
    countBadge: "bg-red-600 text-white",
    tagClass: "bg-red-100 text-red-800",
    addBtnClass: "text-red-700 hover:bg-red-50",
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

export function getStageTotalValue(stageId: LeadKanbanStageId): number {
  return leadKanbanCards
    .filter((c) => c.stageId === stageId)
    .reduce((sum, c) => sum + c.estimatedValue, 0);
}
