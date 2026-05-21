import { leadKanbanCards } from "@/lib/leads-kanban-data";

export type CalendarViewMode = "day" | "week" | "month";

export type LeadCalendarEventType =
  | "site_visit"
  | "call"
  | "follow_up"
  | "meeting"
  | "task";

export type LeadCalendarEvent = {
  id: string;
  leadId: string;
  title: string;
  subtitle: string;
  date: string;
  startTime: string;
  endTime?: string;
  type: LeadCalendarEventType;
  owner: string;
  location?: string;
};

const eventTypeFromTag = (tag: string): LeadCalendarEventType => {
  if (tag.toLowerCase().includes("site visit")) return "site_visit";
  if (tag.toLowerCase().includes("negotiation")) return "meeting";
  if (tag.toLowerCase().includes("quotation")) return "task";
  return "follow_up";
};

const defaultTimes = ["09:00", "10:30", "11:00", "14:00", "15:30", "16:00"];

/** Lead activities & next actions shown on the calendar */
export const leadCalendarEvents: LeadCalendarEvent[] = [
  ...leadKanbanCards.map((card, index) => ({
    id: `cal_${card.id}`,
    leadId: card.id,
    title: card.title,
    subtitle: card.tag,
    date: card.nextActionDate,
    startTime: defaultTimes[index % defaultTimes.length],
    endTime: undefined,
    type: eventTypeFromTag(card.tag),
    owner: card.owner,
    location: card.location,
  })),
  {
    id: "cal_extra_1",
    leadId: "kb_7",
    title: "Follow-up call — Karen Villa",
    subtitle: "Call",
    date: "2026-05-20",
    startTime: "08:30",
    type: "call",
    owner: "Sarah Wanjiku",
    location: "Karen, Nairobi",
  },
  {
    id: "cal_extra_2",
    leadId: "kb_8",
    title: "Site visit — Muthaiga Luxury Home",
    subtitle: "Site Visit",
    date: "2026-05-20",
    startTime: "13:00",
    type: "site_visit",
    owner: "Brian Otieno",
    location: "Muthaiga, Nairobi",
  },
  {
    id: "cal_extra_3",
    leadId: "kb_4",
    title: "Proposal review — Westlands Office",
    subtitle: "Meeting",
    date: "2026-05-21",
    startTime: "10:00",
    type: "meeting",
    owner: "Brian Otieno",
    location: "Westlands, Nairobi",
  },
];

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
