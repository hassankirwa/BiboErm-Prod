export type CalendarViewMode = "day" | "week" | "month";

export type LeadCalendarEventType =
  | "site_visit"
  | "call"
  | "follow_up"
  | "meeting"
  | "task";

export type LeadCalendarEvent = {
  id: string;
  leadId?: string;
  title: string;
  subtitle: string;
  date: string;
  startTime: string;
  endTime?: string;
  type: LeadCalendarEventType;
  owner: string;
  location?: string;
  href?: string | null;
};

/** Demo events removed — calendar uses API lead cards when provided. */
export const leadCalendarEvents: LeadCalendarEvent[] = [];

export const eventTypeStyles: Record<
  LeadCalendarEventType,
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
