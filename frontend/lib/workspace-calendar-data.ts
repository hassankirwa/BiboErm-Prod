export type CalendarViewMode = "day" | "week" | "month";

export type WorkspaceCalendarEventType =
  | "site_visit"
  | "call"
  | "follow_up"
  | "meeting"
  | "task"
  | "field_installation"
  | "project_milestone"
  | "field_day_pin"
  | "custom";

export type WorkspaceCalendarEvent = {
  id: string;
  leadId?: string;
  title: string;
  subtitle: string;
  date: string;
  startTime: string;
  endTime?: string;
  type: WorkspaceCalendarEventType;
  owner: string;
  ownerId?: number;
  location?: string;
  href?: string | null;
  source?: string;
};

/** @deprecated Use WorkspaceCalendarEvent */
export type LeadCalendarEvent = WorkspaceCalendarEvent;

/** @deprecated Use WorkspaceCalendarEventType */
export type LeadCalendarEventType = WorkspaceCalendarEventType;

export const eventTypeStyles: Record<
  WorkspaceCalendarEventType,
  { bg: string; border: string; dot: string }
> = {
  site_visit: {
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-600",
  },
  call: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
  follow_up: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    dot: "bg-teal-600",
  },
  meeting: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-600",
  },
  task: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-600",
  },
  field_installation: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-600",
  },
  project_milestone: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    dot: "bg-indigo-600",
  },
  field_day_pin: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    dot: "bg-cyan-600",
  },
  custom: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-600",
  },
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const HOUR_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export const SOURCE_TYPE_OPTIONS = [
  { value: "crm_activity", label: "Activities" },
  { value: "site_visit", label: "Site visits" },
  { value: "field_installation", label: "Installations" },
  { value: "field_day_pin", label: "Field captures" },
  { value: "project", label: "Projects" },
  { value: "workspace_event", label: "Custom" },
] as const;
