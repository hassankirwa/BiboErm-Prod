export type ActivityCategory = "call" | "meeting" | "email" | "task";

/** UI filter categories → stored activity_type values (mirrors backend groups). */
export const ACTIVITY_TYPE_GROUPS: Record<ActivityCategory, string[]> = {
  call: ["call", "schedule_call", "call_log"],
  meeting: ["meeting", "meeting_note", "schedule_meeting"],
  email: ["email", "email_sent"],
  task: ["task", "create_task", "follow_up"],
};

export const ACTIVITY_LOG_TYPE_OPTIONS: Array<{
  value: string;
  label: string;
  category: ActivityCategory;
}> = [
  { value: "call_log", label: "Call log", category: "call" },
  { value: "schedule_call", label: "Scheduled call", category: "call" },
  { value: "meeting_note", label: "Meeting note", category: "meeting" },
  { value: "meeting", label: "Scheduled meeting", category: "meeting" },
  { value: "email_sent", label: "Email sent", category: "email" },
  { value: "task", label: "Task", category: "task" },
  { value: "follow_up", label: "Follow-up", category: "task" },
];

export function normalizeActivityCategory(
  type: string | null | undefined,
): ActivityCategory | string {
  const normalized = (type ?? "task").toLowerCase();
  for (const [category, types] of Object.entries(ACTIVITY_TYPE_GROUPS)) {
    if (types.includes(normalized)) {
      return category as ActivityCategory;
    }
  }
  return normalized;
}

export function activityTypeLabel(type: string | null | undefined): string {
  const normalized = (type ?? "task").toLowerCase();
  const option = ACTIVITY_LOG_TYPE_OPTIONS.find((o) => o.value === normalized);
  if (option) return option.label;
  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function defaultLogTypeForCategory(
  category: ActivityCategory,
): string {
  switch (category) {
    case "call":
      return "call_log";
    case "meeting":
      return "meeting_note";
    case "email":
      return "email_sent";
    case "task":
    default:
      return "task";
  }
}

export function logTypeOptionsForCategory(
  category: ActivityCategory,
): typeof ACTIVITY_LOG_TYPE_OPTIONS {
  return ACTIVITY_LOG_TYPE_OPTIONS.filter((o) => o.category === category);
}
