import { apiFetch } from "../client";

export type WorkspaceCalendarApiEvent = {
  id: string;
  source: string;
  source_id: number;
  type: string;
  title: string;
  subtitle: string | null;
  starts_at: string;
  ends_at: string;
  assigned_to: { id: number; name: string } | null;
  lead_id: number | null;
  account_id: number | null;
  deal_id?: number | null;
  location: string | null;
  status: string | null;
  href: string | null;
};

export type WorkspaceWorkloadItem = {
  user_id: number;
  name: string;
  count: number;
};

function buildQuery(params?: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function fetchWorkspaceCalendarEvents(params: {
  from: string;
  to: string;
  assigned_to?: number;
  account_id?: number;
  lead_id?: number;
  role?: string;
  department_id?: number;
  source?: string;
}): Promise<{ data: WorkspaceCalendarApiEvent[]; workload: WorkspaceWorkloadItem[] }> {
  return apiFetch<{ data: WorkspaceCalendarApiEvent[]; workload: WorkspaceWorkloadItem[] }>(
    `/api/v1/workspace/calendar/events${buildQuery(params)}`,
  );
}

export type CreateWorkspaceCalendarEventPayload = {
  title: string;
  description?: string;
  event_type?: string;
  starts_at: string;
  ends_at?: string;
  assigned_to?: number;
  location?: string;
  visibility?: "private" | "team" | "all";
};

export async function createWorkspaceCalendarEvent(
  payload: CreateWorkspaceCalendarEventPayload,
): Promise<{ data: Record<string, unknown> }> {
  return apiFetch<{ data: Record<string, unknown> }>("/api/v1/workspace/calendar/events", {
    method: "POST",
    json: payload,
  });
}

export async function deleteWorkspaceCalendarEvent(eventId: number): Promise<void> {
  await apiFetch(`/api/v1/workspace/calendar/events/${eventId}`, {
    method: "DELETE",
  });
}
