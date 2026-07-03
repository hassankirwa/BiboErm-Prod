import { apiFetch } from "./client";

export type AppNotification = {
  id: string;
  type: string;
  message: string | null;
  url: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
};

export async function fetchNotifications(params?: {
  page?: number;
  per_page?: number;
}): Promise<{ data: AppNotification[]; meta: { current_page: number; last_page: number; total: number } }> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.per_page) search.set("per_page", String(params.per_page));
  const query = search.toString();

  return apiFetch(`/api/v1/notifications${query ? `?${query}` : ""}`);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await apiFetch<{ data: { count: number } }>("/api/v1/notifications/unread-count");
  return res.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const res = await apiFetch<{ data: AppNotification }>(`/api/v1/notifications/${id}/read`, {
    method: "POST",
  });
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
}
