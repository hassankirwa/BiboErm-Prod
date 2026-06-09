export type LeadKanbanStageId =
  | "new"
  | "contacted"
  | "interested"
  | "account_created"
  | "not_reachable"
  | "unqualified";

export type LeadActivityType =
  | "create_task"
  | "follow_up"
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

/** v2 lead pipeline: new → contacted → interested → account_created */
export const leadKanbanStages: LeadKanbanStageConfig[] = [
  {
    id: "new",
    label: "New Lead",
    description: "Captured, not yet contacted",
    headerBg: "bg-blue-50",
    headerBorder: "border-blue-200",
    countBadge: "bg-blue-600 text-white",
    tagClass: "bg-blue-100 text-blue-800",
    addBtnClass: "text-blue-700 hover:bg-blue-50",
  },
  {
    id: "contacted",
    label: "Contacted",
    description: "Outreach started — log engagement",
    headerBg: "bg-sky-50",
    headerBorder: "border-sky-200",
    countBadge: "bg-sky-600 text-white",
    tagClass: "bg-sky-100 text-sky-800",
    addBtnClass: "text-sky-700 hover:bg-sky-50",
  },
  {
    id: "interested",
    label: "Interested",
    description: "Client confirmed interest — account provisioning",
    headerBg: "bg-cyan-50",
    headerBorder: "border-cyan-200",
    countBadge: "bg-cyan-600 text-white",
    tagClass: "bg-cyan-100 text-cyan-800",
    addBtnClass: "text-cyan-700 hover:bg-cyan-50",
  },
  {
    id: "account_created",
    label: "Account Created",
    description: "Work continues on the account record",
    headerBg: "bg-emerald-50",
    headerBorder: "border-emerald-200",
    countBadge: "bg-emerald-600 text-white",
    tagClass: "bg-emerald-100 text-emerald-800",
    addBtnClass: "text-emerald-700 hover:bg-emerald-50",
  },
  {
    id: "not_reachable",
    label: "Not Reachable",
    description: "Could not reach after attempts",
    headerBg: "bg-slate-50",
    headerBorder: "border-slate-200",
    countBadge: "bg-slate-600 text-white",
    tagClass: "bg-slate-100 text-slate-800",
    addBtnClass: "text-slate-700 hover:bg-slate-50",
    terminal: true,
  },
  {
    id: "unqualified",
    label: "Unqualified",
    description: "Not worth pursuing",
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

export function getStageTotalValue(stageId: LeadKanbanStageId): number {
  return leadKanbanCards
    .filter((c) => c.stageId === stageId)
    .reduce((sum, c) => sum + c.estimatedValue, 0);
}
