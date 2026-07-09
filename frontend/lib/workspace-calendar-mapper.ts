import type { WorkspaceCalendarEvent, WorkspaceCalendarEventType } from "@/lib/workspace-calendar-data";
import type { WorkspaceCalendarApiEvent } from "@/lib/api/workspace/calendar";

const calendarActivityTypeMap: Record<string, WorkspaceCalendarEventType> = {
  site_visit: "site_visit",
  schedule_call: "call",
  call_log: "call",
  call: "call",
  meeting_note: "meeting",
  meeting: "meeting",
  create_task: "task",
  task: "task",
  follow_up: "follow_up",
  email_sent: "follow_up",
  field_installation: "field_installation",
  project_milestone: "project_milestone",
  field_day_pin: "field_day_pin",
  custom: "custom",
};

function mapApiType(event: WorkspaceCalendarApiEvent): WorkspaceCalendarEventType {
  if (event.source === "site_visit") return "site_visit";
  if (event.source === "field_installation") return "field_installation";
  if (event.source === "field_day_pin") return "field_day_pin";
  if (event.source === "project") return "project_milestone";
  if (event.source === "workspace_event") return "custom";

  return calendarActivityTypeMap[event.type] ?? "task";
}

export function workspaceCalendarApiToEvents(
  events: WorkspaceCalendarApiEvent[],
): WorkspaceCalendarEvent[] {
  return events.map((event) => {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : null;

    return {
      id: event.id,
      leadId: event.lead_id ? String(event.lead_id) : undefined,
      title: event.title,
      subtitle: event.subtitle ?? "",
      date: start.toISOString().slice(0, 10),
      startTime: start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      endTime: end
        ? end.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : undefined,
      type: mapApiType(event),
      owner: event.assigned_to?.name ?? "",
      ownerId: event.assigned_to?.id,
      location: event.location ?? undefined,
      href: event.href,
      source: event.source,
    };
  });
}
