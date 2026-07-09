import { apiFetch } from "../client";
import type { WorkspaceCalendarApiEvent, WorkspaceWorkloadItem } from "./calendar";
import type { WorkspaceTaskItem } from "./tasks";

export type WorkspaceTodayStats = {
  site_visits_today: number;
  open_leads: number;
  measurements_pending: number;
  open_tasks_count: number;
  clients_captured_today: number;
  field_installations_today: number;
  projects_active: number;
  meetings_today: number;
  pipeline_value: number;
  field_days_active: number;
};

export type WorkspaceTodayData = {
  date: string;
  user_id: number;
  stats: WorkspaceTodayStats;
  sections: {
    schedule: WorkspaceCalendarApiEvent[];
    site_visits: Array<{
      id: number;
      title: string;
      status: string;
      visit_time: string | null;
      site_address: string | null;
      assigned_to: { id: number; name: string } | null;
      lead_name: string | null;
      href: string;
    }>;
    field_installations: Array<{
      id: number;
      reference: string;
      title: string | null;
      status: string;
      site_address: string | null;
      assigned_to: { id: number; name: string } | null;
      href: string;
    }>;
    clients_captured: Array<{
      id: string;
      type: string;
      title: string;
      captured_at: string | null;
      href: string;
    }>;
    open_tasks: WorkspaceTaskItem[];
    projects: Array<{
      id: number;
      reference: string;
      name: string;
      stage: string;
      href: string;
    }>;
    field_day: {
      id: number;
      field_officer: { id: number; name: string } | null;
      pins_count: number;
      href: string;
    } | null;
  };
  workload: WorkspaceWorkloadItem[];
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

export async function fetchWorkspaceToday(params?: {
  date?: string;
  user_id?: number;
  role?: string;
  department_id?: number;
}): Promise<{ data: WorkspaceTodayData }> {
  return apiFetch<{ data: WorkspaceTodayData }>(
    `/api/v1/workspace/today${buildQuery(params)}`,
  );
}
