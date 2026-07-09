"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WorkspaceResourceFilters,
  type WorkspaceResourceFilters as Filters,
} from "@/components/workspace/workspace-resource-filters";
import { fetchWorkspaceTasks, type WorkspaceTaskItem } from "@/lib/api/workspace/tasks";
import { completeActivity } from "@/lib/api/crm/activities";
import { startSiteVisit } from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import {
  Calendar,
  CheckCircle2,
  MapPin,
  Phone,
  Play,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "task", label: "Tasks" },
  { id: "site_visit", label: "Visits" },
  { id: "meeting", label: "Meetings" },
  { id: "project", label: "Projects" },
  { id: "field_installation", label: "Field" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function taskIcon(type: string) {
  switch (type) {
    case "site_visit":
      return <MapPin className="h-4 w-4" />;
    case "meeting":
      return <Calendar className="h-4 w-4" />;
    case "call":
      return <Phone className="h-4 w-4" />;
    case "field_installation":
      return <Wrench className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "—";
  return new Date(dueAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkspaceTasksView() {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState<Filters>({});
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [tasks, setTasks] = useState<WorkspaceTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkspaceTasks({
        assigned_to: filters.assigned_to,
        role: filters.role,
        type: activeTab === "all" ? undefined : activeTab,
        status: "open",
      });
      setTasks(res.data ?? []);
    } catch (err) {
      setTasks([]);
      setError(
        err instanceof ApiError ? err.message : "Failed to load workspace tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleComplete(task: WorkspaceTaskItem) {
    if (task.source !== "crm_activity") return;
    const activityId = Number(task.id.replace("activity-", ""));
    setActionId(task.id);
    try {
      await ensureCsrfCookie();
      await completeActivity(activityId);
      toast.success("Task completed");
      loadTasks();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to complete task");
    } finally {
      setActionId(null);
    }
  }

  async function handleStartVisit(task: WorkspaceTaskItem) {
    if (task.source !== "site_visit") return;
    const visitId = Number(task.id.replace("site-visit-", ""));
    setActionId(task.id);
    try {
      await ensureCsrfCookie();
      await startSiteVisit(visitId);
      toast.success("Visit started");
      loadTasks();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start visit");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <WorkspaceResourceFilters value={filters} onChange={setFilters} showSourceFilter={false} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Work queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No open tasks in this view.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-muted-foreground">{taskIcon(task.type)}</span>
                        <div>
                          <Link href={task.href} className="font-medium hover:underline">
                            {task.title}
                          </Link>
                          {task.meta.location && (
                            <p className="text-xs text-muted-foreground">{task.meta.location}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{task.type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm">{formatDue(task.due_at)}</TableCell>
                    <TableCell className="text-sm">
                      {task.assigned_to?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {task.source === "crm_activity" && hasPermission("activities.complete") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === task.id}
                            onClick={() => handleComplete(task)}
                          >
                            Complete
                          </Button>
                        )}
                        {task.source === "site_visit" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === task.id}
                            onClick={() => handleStartVisit(task)}
                          >
                            <Play className={cn("mr-1 h-3 w-3")} />
                            Start
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={task.href}>Open</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
