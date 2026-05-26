export type LeadViewMode = "list" | "kanban" | "calendar" | "map";

export type LeadActivity =
  | { type: "today" }
  | { type: "date"; label: string; tone: "green" | "red" }
  | { type: "calendar" };

export type LeadListRow = {
  id: string;
  leadName: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  stageClassName: string;
  source: string;
  owner: string;
  ownerInitials: string;
  activity: LeadActivity;
  statusKey: string;
};

/** Demo rows removed — list view uses live API data. */
export const leadsListRows: LeadListRow[] = [];

export const LEADS_TOTAL_COUNT = 0;

export const leadKanbanColumns = [
  { id: "new", label: "New Lead", color: "bg-blue-50" },
  { id: "qualified", label: "Qualified", color: "bg-green-50" },
  { id: "site_visit_scheduled", label: "Site Visit", color: "bg-orange-50" },
  { id: "quotation_sent", label: "Quotation Sent", color: "bg-violet-50" },
  { id: "negotiation", label: "Negotiation", color: "bg-amber-50" },
  { id: "won", label: "Won", color: "bg-emerald-50" },
] as const;

export const leadScopeFilters = [
  "All Leads",
  "My Leads",
  "Unassigned",
  "Hot Leads",
] as const;
