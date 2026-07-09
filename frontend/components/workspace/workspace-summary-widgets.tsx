"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspaceAnalytics } from "@/hooks/use-workspace-analytics";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardCheck,
  DollarSign,
  FolderKanban,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

function formatKes(value: number, compact = false): string {
  if (compact && value >= 1_000_000) {
    return `KES ${(value / 1_000_000).toFixed(2)}M`;
  }
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function WidgetCardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      <Link
        href={href}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        {linkLabel}
      </Link>
    </CardHeader>
  );
}

function ProductionDonut({
  inProgress,
  completed,
  planned,
}: {
  inProgress: number;
  completed: number;
  planned: number;
}) {
  const total = inProgress + completed + planned;
  const capacityPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  return (
    <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray={`${capacityPct} ${100 - capacityPct}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <span className="text-xs font-bold text-foreground">{capacityPct}%</span>
        <span className="block text-[9px] text-muted-foreground">Active</span>
      </div>
    </div>
  );
}

export function WorkspaceSummaryWidgets() {
  const { permissions } = useAuth();
  const { data, loading, refreshing, refresh } = useWorkspaceAnalytics(permissions);
  const { pipeline, projects, crm, qc, lastUpdated } = data;

  const inProgress = projects?.started ?? 0;
  const completed = projects?.completed ?? 0;
  const planned = (projects?.queued ?? 0) + (projects?.awaiting_procurement ?? 0);
  const activeProjects = projects ? projects.total_projects - projects.completed : 0;
  const revenueMtd = crm?.kpis.payments_received ?? 0;
  const pipelineValue =
    crm?.kpis.pipeline_value ?? pipeline?.pipeline_value ?? 0;
  const qcPending =
    qc?.pending_inspections_count ?? qc?.due_schedules_count ?? 0;

  return (
    <section className="min-w-0 w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Operations snapshot</h2>
          <p className="text-xs text-muted-foreground">
            Live from backend
            {lastUpdated
              ? ` · ${lastUpdated.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={refreshing}
            onClick={() => refresh()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/analytics">
              <BarChart3 className="h-3.5 w-3.5" />
              Full analytics
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-2 gap-2 min-[520px]:grid-cols-4">
        {[
          {
            label: "Active projects",
            value: String(activeProjects),
            icon: FolderKanban,
          },
          {
            label: "Revenue (MTD)",
            value: formatKes(revenueMtd, true),
            icon: DollarSign,
          },
          {
            label: "Pipeline value",
            value: formatKes(pipelineValue, true),
            icon: TrendingUp,
          },
          {
            label: "QC pending",
            value: String(qcPending),
            icon: ClipboardCheck,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="min-w-0 rounded-[10px] border-border/60 shadow-sm"
            >
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-base font-semibold tabular-nums">
                    {loading ? "…" : kpi.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
          <WidgetCardHeader
            title="Pipeline Overview"
            href="/crm/leads?view=kanban"
            linkLabel="Open pipeline"
          />
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4 text-sm">
            {loading ? (
              <div className="col-span-2 flex justify-center py-6">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Open Leads</p>
                  <p className="text-lg font-semibold">{pipeline?.open_leads ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Deals</p>
                  <p className="text-lg font-semibold">
                    {pipeline?.open_deals ?? crm?.kpis.open_deals ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visits Today</p>
                  <p className="text-lg font-semibold">
                    {pipeline?.site_visits_today ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Design Pending</p>
                  <p className="text-lg font-semibold">
                    {pipeline?.design_jobs_pending ?? "—"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
          <WidgetCardHeader
            title="Production Status"
            href="/production/schedule"
            linkLabel="View shop floor"
          />
          <CardContent className="flex flex-col items-start gap-4 px-4 pb-4 min-[400px]:flex-row min-[400px]:items-center">
            {loading ? (
              <div className="flex w-full justify-center py-4">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <>
                <ProductionDonut
                  inProgress={inProgress}
                  completed={completed}
                  planned={planned}
                />
                <ul className="min-w-0 w-full space-y-1.5 text-xs">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">
                      In progress{" "}
                      <span className="font-semibold text-foreground">({inProgress})</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">
                      Completed{" "}
                      <span className="font-semibold text-foreground">({completed})</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                    <span className="text-muted-foreground">
                      Queued / procurement{" "}
                      <span className="font-semibold text-foreground">({planned})</span>
                    </span>
                  </li>
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
          <WidgetCardHeader
            title="Quotation Pipeline"
            href="/quotation/proforma"
            linkLabel="Proforma queue"
          />
          <CardContent className="space-y-3 px-4 pb-4 text-sm">
            {loading ? (
              <div className="flex justify-center py-4">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="min-w-0">
                    Ready for quotation:{" "}
                    <span className="font-semibold">
                      {pipeline?.ready_for_quotation ?? 0}
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    Proforma sent:{" "}
                    <span className="font-semibold">
                      {pipeline?.proforma_quotations_sent ?? 0}
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span className="min-w-0">
                    Awaiting deposit:{" "}
                    <span className="font-semibold">
                      {pipeline?.awaiting_deposit ?? crm?.kpis.quotations_accepted ?? 0}
                    </span>
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
          <WidgetCardHeader title="Field & CRM" href="/site-ops/quotation/today" linkLabel="Site ops" />
          <CardContent className="space-y-3 px-4 pb-4 text-sm">
            {loading ? (
              <div className="flex justify-center py-4">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span className="min-w-0">
                    {pipeline?.site_visits_today ?? 0} visits scheduled today
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span className="min-w-0">
                    {pipeline?.measurements_submitted ?? 0} measurements awaiting review
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    {crm?.kpis.won_deals ?? 0} deals won this month
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
