"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { WorkspaceCalendarView } from "@/components/workspace/workspace-calendar-view";
import {
  WorkspaceResourceFilters,
  type WorkspaceResourceFilters as Filters,
} from "@/components/workspace/workspace-resource-filters";
import { fetchWorkspaceToday, type WorkspaceTodayData } from "@/lib/api/workspace/today";
import { workspaceCalendarApiToEvents } from "@/lib/workspace-calendar-mapper";
import { ApiError } from "@/lib/api/errors";
import {
  Calendar,
  ClipboardList,
  MapPin,
  Users,
  Wrench,
} from "lucide-react";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <Card className="rounded-[10px] border-border/60 shadow-sm">
      <CardContent className="px-4 py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}

export function WorkspaceTodayView() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const [filters, setFilters] = useState<Filters>({});
  const [data, setData] = useState<WorkspaceTodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkspaceToday({
        date: today,
        user_id: filters.assigned_to,
        role: filters.role,
      });
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : "Failed to load today's briefing.");
    } finally {
      setLoading(false);
    }
  }, [today, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const scheduleEvents = useMemo(
    () => workspaceCalendarApiToEvents(data?.sections.schedule ?? []),
    [data],
  );

  const stats = data?.stats;

  const showVisits =
    hasAnyPermission("site_visits.view", "site_visits.execute") &&
    (data?.sections.site_visits.length ?? 0) > 0;
  const showInstallations =
    hasPermission("field_installation.view") &&
    (data?.sections.field_installations.length ?? 0) > 0;
  const showCaptured =
    hasAnyPermission("leads.view", "field_day.view", "crm.view") &&
    (data?.sections.clients_captured.length ?? 0) > 0;
  const showTasks =
    hasPermission("activities.view") && (data?.sections.open_tasks.length ?? 0) > 0;
  const showProjects =
    hasPermission("projects.view") && (data?.sections.projects.length ?? 0) > 0;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Today"
        subtitle="Your schedule, visits, and priorities for today."
      />
      <div className="space-y-6 p-6">
        <WorkspaceResourceFilters value={filters} onChange={setFilters} showSourceFilter={false} />

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
            {error}
          </p>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Visits today" value={stats.site_visits_today} href="/workspace/calendar" />
                <StatCard label="Open tasks" value={stats.open_tasks_count} href="/workspace/tasks" />
                <StatCard label="Meetings" value={stats.meetings_today} />
                <StatCard label="Clients captured" value={stats.clients_captured_today} />
                <StatCard label="Installations" value={stats.field_installations_today} />
                <StatCard label="Active projects" value={stats.projects_active} href="/projects" />
              </div>
            )}

            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Today&apos;s schedule</h2>
              <WorkspaceCalendarView
                events={scheduleEvents}
                initialViewMode="day"
                initialDate={new Date()}
                hideViewToggle
                compact
                emptyMessage="Nothing scheduled for today."
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {showVisits && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" />
                      Site visits
                    </CardTitle>
                    <Link href="/crm/site-visits/today" className="text-xs text-primary hover:underline">
                      View all
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data!.sections.site_visits.map((visit) => (
                      <Link
                        key={visit.id}
                        href={visit.href}
                        className="block rounded-md border border-border p-3 hover:bg-muted/40"
                      >
                        <p className="font-medium">{visit.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {visit.visit_time ?? "—"} · {visit.site_address ?? "—"}
                        </p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {showTasks && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4" />
                      Tasks due
                    </CardTitle>
                    <Link href="/workspace/tasks" className="text-xs text-primary hover:underline">
                      View all
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data!.sections.open_tasks.map((task) => (
                      <Link
                        key={task.id}
                        href={task.href}
                        className="block rounded-md border border-border p-3 hover:bg-muted/40"
                      >
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {task.type.replace(/_/g, " ")} · {task.status}
                        </p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {showInstallations && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wrench className="h-4 w-4" />
                      Field installations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data!.sections.field_installations.map((job) => (
                      <Link
                        key={job.id}
                        href={job.href}
                        className="block rounded-md border border-border p-3 hover:bg-muted/40"
                      >
                        <p className="font-medium">{job.reference}</p>
                        <p className="text-xs text-muted-foreground">{job.title ?? job.site_address}</p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {showCaptured && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Clients captured today
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data!.sections.clients_captured.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="block rounded-md border border-border p-3 hover:bg-muted/40"
                      >
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs capitalize text-muted-foreground">{item.type}</p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {showProjects && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4" />
                      Project milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data!.sections.projects.map((project) => (
                      <Link
                        key={project.id}
                        href={project.href}
                        className="block rounded-md border border-border p-3 hover:bg-muted/40"
                      >
                        <p className="font-medium">{project.reference}</p>
                        <p className="text-xs text-muted-foreground">{project.name}</p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {data?.sections.field_day && hasPermission("field_day.view") && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Field day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={data.sections.field_day.href}
                      className="block rounded-md border border-border p-3 hover:bg-muted/40"
                    >
                      <p className="font-medium">
                        {data.sections.field_day.field_officer?.name ?? "Active field day"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.sections.field_day.pins_count} capture
                        {data.sections.field_day.pins_count !== 1 ? "s" : ""} today
                      </p>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
