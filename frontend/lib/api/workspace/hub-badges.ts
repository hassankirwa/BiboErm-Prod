import { apiFetch } from "../client";

export type WorkspaceHubBadge = {
  count: number;
  label: string;
  className: string;
};

export type WorkspaceHubBadges = Partial<
  Record<
    "warehouse" | "procurement" | "dispatch" | "finance" | "hr",
    WorkspaceHubBadge
  >
>;

export async function fetchWorkspaceHubBadges(): Promise<{
  data: WorkspaceHubBadges;
}> {
  return apiFetch<{ data: WorkspaceHubBadges }>("/api/v1/workspace/hub-badges", {
    cacheTtlMs: 30_000,
  });
}
