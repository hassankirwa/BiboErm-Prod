import { apiFetch } from "../client";

export type WorkspaceTaskItem = {
  id: string;
  source: string;
  type: string;
  title: string;
  due_at: string | null;
  assigned_to: { id: number; name: string } | null;
  status: string;
  priority: string;
  href: string;
  meta: Record<string, string | null | undefined>;
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

export async function fetchWorkspaceTasks(params?: {
  assigned_to?: number;
  type?: string;
  status?: string;
  due_before?: string;
  role?: string;
  department_id?: number;
}): Promise<{ data: WorkspaceTaskItem[]; meta: { total: number } }> {
  return apiFetch<{ data: WorkspaceTaskItem[]; meta: { total: number } }>(
    `/api/v1/workspace/tasks${buildQuery(params)}`,
  );
}
