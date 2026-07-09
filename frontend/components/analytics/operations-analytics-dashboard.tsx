"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Factory,
  FolderKanban,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { fetchCrmReportsDashboard, type CrmReportDashboard } from "@/lib/api/crm/reports";
import { fetchActivities, type ApiActivity } from "@/lib/api/crm/activities";
import { fetchPipelineDashboard, type PipelineDashboardData } from "@/lib/api/pipeline/dashboard";
import {
  getProjectsDashboard,
  getProjectsPipeline,
  listProjects,
  type ProjectSummary,
  type ProjectsDashboard,
  type ProjectsPipelineResponse,
} from "@/lib/api/projects";
import { getQcDashboardSummary, type QcDashboardSummary } from "@/lib/api/qc";

const REFRESH_MS = 60_000;
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function hasPermission(permissions: string[], slug: string): boolean {
  return permissions.includes("*") || permissions.includes(slug);
}

function monthStart(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatKes(value: number, compact = false): string {
  if (compact && value >= 1_000_000) {
    return `KES ${(value / 1_000_000).toFixed(2)}M`;
  }
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function activityType(activity: ApiActivity): string {
  return activity.activity_type ?? activity.type ?? "task";
}

export function OperationsAnalyticsDashboard() {
  const { permissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [pipeline, setPipeline] = useState<PipelineDashboardData | null>(null);
  const [projectsDashboard, setProjectsDashboard] = useState<ProjectsDashboard | null>(null);
  const [projectsPipeline, setProjectsPipeline] = useState<ProjectsPipelineResponse | null>(null);
  const [crmDashboard, setCrmDashboard] = useState<CrmReportDashboard | null>(null);
  const [qcSummary, setQcSummary] = useState<QcDashboardSummary | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [recentActivities, setRecentActivities] = useState<ApiActivity[]>([]);

  const canCrm =
    hasPermission(permissions, "crm.view") ||
    hasPermission(permissions, "leads.view");
  const canProjects = hasPermission(permissions, "projects.view");
  const canQc = hasPermission(permissions, "qc.view");

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    const tasks: Promise<void>[] = [];

    if (canCrm || canProjects) {
      tasks.push(
        fetchPipelineDashboard()
          .then(setPipeline)
          .catch(() => setPipeline(null)),
      );
    }

    if (canProjects) {
      tasks.push(
        getProjectsDashboard()
          .then((res) => setProjectsDashboard(res.data))
          .catch(() => setProjectsDashboard(null)),
      );
      tasks.push(
        getProjectsPipeline()
          .then(setProjectsPipeline)
          .catch(() => setProjectsPipeline(null)),
      );
      tasks.push(
        listProjects({ per_page: 4 })
          .then((res) => setRecentProjects(res.data ?? []))
          .catch(() => setRecentProjects([])),
      );
    }

    if (canCrm) {
      tasks.push(
        fetchCrmReportsDashboard({ from: monthStart(), to: todayIso() })
          .then(setCrmDashboard)
          .catch(() => setCrmDashboard(null)),
      );
      tasks.push(
        fetchActivities({ per_page: 5 })
          .then((res) => setRecentActivities(res.data ?? []))
          .catch(() => setRecentActivities([])),
      );
    }

    if (canQc) {
      tasks.push(
        getQcDashboardSummary()
          .then((res) => setQcSummary(res.data))
          .catch(() => setQcSummary(null)),
      );
    }

    try {
      await Promise.all(tasks);
      setLastUpdated(new Date());
    } catch {
      setError("Some analytics data could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canCrm, canProjects, canQc]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const activeProjects = projectsDashboard
      ? projectsDashboard.total_projects - projectsDashboard.completed
      : 0;
    const leadsThisMonth = crmDashboard?.kpis.total_leads ?? 0;
    const dealsWon = crmDashboard?.kpis.won_deals ?? 0;
    const revenueMtd = crmDashboard?.kpis.payments_received ?? 0;
    const pipelineValue =
      crmDashboard?.kpis.pipeline_value ?? pipeline?.pipeline_value ?? 0;
    const productionInProgress = projectsDashboard?.started ?? 0;
    const qcPending =
      qcSummary?.pending_inspections_count ??
      qcSummary?.due_schedules_count ??
      0;
    const alerts =
      (projectsDashboard?.awaiting_procurement ?? 0) +
      (pipeline?.measurements_submitted ?? 0) +
      (qcSummary?.open_defects_count ?? 0);

    return [
      {
        title: "Active Projects",
        value: String(activeProjects),
        description: projectsDashboard
          ? `${projectsDashboard.queued} queued · ${projectsDashboard.started} in production`
          : "Projects module",
        icon: FolderKanban,
        trend: "neutral" as const,
      },
      {
        title: "Leads This Month",
        value: String(leadsThisMonth),
        description: `${dealsWon} deals won`,
        icon: Users,
        trend: "up" as const,
      },
      {
        title: "Revenue (MTD)",
        value: formatKes(revenueMtd, true),
        description: "Payments received",
        icon: DollarSign,
        trend: "up" as const,
      },
      {
        title: "Pipeline Value",
        value: formatKes(pipelineValue, true),
        description: `${pipeline?.open_deals ?? crmDashboard?.kpis.open_deals ?? 0} open deals`,
        icon: TrendingUp,
        trend: "neutral" as const,
      },
      {
        title: "Awaiting Procurement",
        value: String(projectsDashboard?.awaiting_procurement ?? 0),
        description: "Projects waiting on materials",
        icon: Package,
        trend:
          (projectsDashboard?.awaiting_procurement ?? 0) > 0
            ? ("warning" as const)
            : ("neutral" as const),
      },
      {
        title: "Production",
        value: String(productionInProgress),
        description: "Projects in production stages",
        icon: Factory,
        trend: "neutral" as const,
      },
      {
        title: "QC Pending",
        value: String(qcPending),
        description: "Inspections due or pending",
        icon: ClipboardCheck,
        trend: qcPending > 2 ? ("warning" as const) : ("neutral" as const),
      },
      {
        title: "Alerts",
        value: String(alerts),
        description: "Items requiring attention",
        icon: AlertTriangle,
        trend: alerts > 0 ? ("warning" as const) : ("neutral" as const),
      },
    ];
  }, [crmDashboard, pipeline, projectsDashboard, qcSummary]);

  const revenueChartData = useMemo(() => {
    const performers = crmDashboard?.top_performers ?? [];
    if (performers.length === 0) {
      return [{ name: "Pipeline", revenue: (pipeline?.pipeline_value ?? 0) / 1_000_000 }];
    }
    return performers.slice(0, 5).map((rep) => ({
      name: rep.name.split(" ")[0] ?? rep.name,
      revenue: rep.revenue / 1_000_000,
    }));
  }, [crmDashboard, pipeline]);

  const projectStageData = useMemo(() => {
    const columns = projectsPipeline?.data ?? [];
    return columns
      .filter((col) => col.count > 0)
      .slice(0, 6)
      .map((col, index) => ({
        name: col.label.split(" ")[0] ?? col.label,
        value: col.count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [projectsPipeline]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Live data from CRM, pipeline, projects, and QC endpoints
          {lastUpdated
            ? ` · Updated ${lastUpdated.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={refreshing}
          onClick={() => load()}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon
                  className={cn(
                    "h-4 w-4",
                    metric.trend === "warning"
                      ? "text-warning"
                      : metric.trend === "up"
                        ? "text-success"
                        : "text-muted-foreground",
                  )}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue & performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}M`}
                    tick={{ fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`KES ${value.toFixed(2)}M`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6">
              <h4 className="mb-3 text-sm font-medium text-foreground">Projects by stage</h4>
              <div className="flex items-center gap-6">
                <div className="h-[120px] w-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          projectStageData.length
                            ? projectStageData
                            : [{ name: "None", value: 1, color: "var(--muted)" }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {projectStageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {projectStageData.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No active pipeline stages</span>
                  ) : (
                    projectStageData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                        <span className="ml-auto text-xs font-medium text-foreground">
                          {item.value}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent activities</CardTitle>
            <Link href="/crm/activities" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent CRM activities.</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const type = activityType(activity);
                  const isCompleted =
                    activity.status === "completed" || Boolean(activity.completed_at);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md",
                          isCompleted
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {activity.subject}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" className="h-5 text-[10px]">
                            {type.replace(/_/g, " ")}
                          </Badge>
                          {activity.due_at && !isCompleted ? (
                            <span className="text-[10px] text-muted-foreground">
                              Due: {new Date(activity.due_at).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Active projects</CardTitle>
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <Link href="/projects">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects to display.</p>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${project.id}`}
                        className="truncate text-sm font-medium text-foreground hover:text-primary"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{project.reference}</p>
                    </div>
                    <Badge variant="secondary">{formatStage(project.stage)}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={project.completion_percent} className="h-1.5 flex-1" />
                    <span className="w-10 text-right text-xs font-medium text-muted-foreground">
                      {project.completion_percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
