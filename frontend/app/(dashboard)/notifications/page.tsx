"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";
import { ApiError } from "@/lib/api/errors";
import { Bell } from "lucide-react";
import { toast } from "sonner";

function formatWhen(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications({ per_page: 50 });
      setNotifications(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkRead(notification: AppNotification) {
    if (notification.read_at) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not mark notification as read.");
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="flex flex-col">
      <AppHeader
        title="Notifications"
        subtitle="Alerts and updates across your operations"
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" disabled={markingAll} onClick={() => void handleMarkAllRead()}>
              Mark all read
            </Button>
          ) : null
        }
      />
      <div className="min-w-0 w-full p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="max-w-lg rounded-[10px]">
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Bell className="h-5 w-5 shrink-0 text-primary" />
              You&apos;re all caught up. Assignment and workflow alerts will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`rounded-[10px] ${notification.read_at ? "opacity-80" : "border-primary/30"}`}
              >
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!notification.read_at ? (
                        <Badge variant="default" className="text-[10px]">
                          New
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatWhen(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{notification.message ?? "Notification"}</p>
                  </div>
                  <div className="flex gap-2">
                    {notification.url ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={notification.url}
                          onClick={() => void handleMarkRead(notification)}
                        >
                          Open
                        </Link>
                      </Button>
                    ) : null}
                    {!notification.read_at ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleMarkRead(notification)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
