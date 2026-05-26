"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Coins,
  FileSpreadsheet,
  MoreHorizontal,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CrmPageContent } from "@/components/crm/crm-page-shell";
import {
  LeadGenerationTargetChart,
  RevenueTargetChart,
} from "@/components/crm/crm-analytics-target-charts";
import {
  fetchCrmReportsDashboard,
  type CrmReportDashboard,
} from "@/lib/api/crm/reports";

const kpiIcons = {
  users: Users,
  coin: Coins,
  briefcase: Briefcase,
  target: Target,
} as const;

const SOURCE_COLORS = ["#2563eb", "#ec2024", "#16a34a", "#f59e0b", "#8b5cf6", "#64748b"];

type PeriodPreset = "this_month" | "last_30_days" | "this_quarter";

function periodRange(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  if (preset === "last_30_days") {
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 29);
    return { from: fromDate.toISOString().slice(0, 10), to };
  }

  if (preset === "this_quarter") {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    const fromDate = new Date(today.getFullYear(), quarterStartMonth, 1);
    return { from: fromDate.toISOString().slice(0, 10), to };
  }

  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function formatKes(value: number, compact = false): string {
  if (compact && value >= 1_000_000) {
    return `KES ${(value / 1_000_000).toFixed(2)}M`;
  }
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function formatPeriodLabel(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function CrmAnalyticsDashboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_month");
  const [data, setData] = useState<CrmReportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(() => {
    const { from, to } = periodRange(periodPreset);
    setRefreshing(true);
    setError(null);

    return fetchCrmReportsDashboard({
      from,
      to,
      owner_id: scope === "mine" && user?.id ? String(user.id) : undefined,
    })
      .then(setData)
      .catch(() => {
        setData(null);
        setError("Could not load analytics. Check your CRM permissions and try again.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [periodPreset, scope, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const kpis = useMemo(() => {
    const k = data?.kpis;
    if (!k) return [];

    return [
      {
        label: "Leads (period)",
        value: String(k.total_leads),
        hint: `${k.converted_leads} converted · ${k.lead_conversion_rate}% rate`,
        icon: "users" as const,
      },
      {
        label: "Pipeline Value",
        value: formatKes(k.pipeline_value, true),
        hint: `${k.open_deals} open deals`,
        icon: "coin" as const,
      },
      {
        label: "Won Revenue",
        value: formatKes(k.won_revenue, true),
        hint: `${k.won_deals} won · ${k.win_rate}% win rate`,
        icon: "briefcase" as const,
      },
      {
        label: "Payments Received",
        value: formatKes(k.payments_received, true),
        hint: `${k.activities_completed}/${k.activities_total} activities done`,
        icon: "target" as const,
      },
    ];
  }, [data]);

  const metricRows = useMemo(() => {
    const k = data?.kpis;
    if (!k) return [];

    return [
      { metric: "Leads created", value: String(k.total_leads) },
      { metric: "Open leads", value: String(k.open_leads) },
      { metric: "Deals created", value: String(k.deals_created) },
      { metric: "Open deals", value: String(k.open_deals) },
      { metric: "Won deals", value: String(k.won_deals) },
      { metric: "Lost deals", value: String(k.lost_deals) },
      { metric: "Won revenue (KES)", value: k.won_revenue.toLocaleString("en-KE") },
      { metric: "Quotations sent", value: String(k.quotations_sent) },
      { metric: "Quotations accepted", value: String(k.quotations_accepted) },
      { metric: "Site visits", value: String(k.site_visits) },
      { metric: "Payments received (KES)", value: k.payments_received.toLocaleString("en-KE") },
    ];
  }, [data]);

  const leadsBySource = useMemo(() => {
    return (data?.leads_by_source ?? []).map((row, i) => ({
      name: row.label,
      value: row.count,
      fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }));
  }, [data]);

  const topReps = data?.top_performers ?? [];
  const fallbackPeriod = periodRange(periodPreset);
  const periodLabel = data
    ? formatPeriodLabel(data.period.from, data.period.to)
    : formatPeriodLabel(fallbackPeriod.from, fallbackPeriod.to);

  if (loading && !data) {
    return (
      <CrmPageContent>
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </CrmPageContent>
    );
  }

  return (
    <CrmPageContent>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as "all" | "mine")}
          >
            <SelectTrigger className="h-9 w-[120px] rounded-[5px] border-border bg-background text-sm">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="mine">Mine</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={periodPreset}
            onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}
          >
            <SelectTrigger className="h-9 w-[160px] rounded-[5px] border-border bg-background text-sm">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="this_quarter">This quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-[5px]"
            disabled={refreshing}
            onClick={() => loadAnalytics()}
            aria-label="Refresh analytics"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <p className="w-full text-xs text-muted-foreground sm:w-auto">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-[5px] text-sm font-medium"
            asChild
          >
            <Link href="/crm/reports">
              <FileSpreadsheet className="h-4 w-4" />
              Sales reports
            </Link>
          </Button>
          <UiTooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-[5px] text-sm font-medium"
                  disabled
                >
                  Add component
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Custom dashboards — Phase 2</TooltipContent>
          </UiTooltip>
          <UiTooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button size="sm" className="h-9 rounded-[5px] text-sm font-medium" disabled>
                  Create dashboard
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Custom dashboards — Phase 2</TooltipContent>
          </UiTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-[5px]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Export snapshot (coming soon)</DropdownMenuItem>
              <DropdownMenuItem disabled>Share (coming soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpiIcons[kpi.icon];
          return (
            <Card
              key={kpi.label}
              className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                      {kpi.value}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                      <TrendingUp className="h-3 w-3 shrink-0" />
                      Live from API
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data && (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <LeadGenerationTargetChart
              title="Leads this period"
              current={data.kpis.total_leads}
              target={Math.max(data.kpis.total_leads, data.kpis.open_leads + data.kpis.converted_leads, 1)}
            />
            <RevenueTargetChart
              title="Won revenue vs open pipeline"
              achieved={data.kpis.won_revenue}
              target={Math.max(data.kpis.pipeline_value, data.kpis.won_revenue, 1)}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-12">
            <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-5">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">Period metrics</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Metric</TableHead>
                      <TableHead className="pr-4 text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricRows.map((row) => (
                      <TableRow key={row.metric}>
                        <TableCell className="pl-4 font-medium">{row.metric}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums font-medium text-foreground">
                          {row.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-4">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">Leads by source</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="h-[260px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          leadsBySource.length
                            ? leadsBySource
                            : [{ name: "No leads in period", value: 1, fill: "#e5e7eb" }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {leadsBySource.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, "Leads"]}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-xs text-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-sm font-semibold text-foreground">
                  {data.kpis.total_leads}{" "}
                  <span className="font-normal text-muted-foreground">leads in period</span>
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-3">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">Top performers</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 pl-4">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="pr-4 text-right">Won (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topReps.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No won deals in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      topReps.map((rep, index) => (
                        <TableRow key={rep.owner_id ?? rep.name}>
                          <TableCell className="pl-4 text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{rep.name}</TableCell>
                          <TableCell className="pr-4 text-right tabular-nums font-medium text-foreground">
                            {rep.revenue.toLocaleString("en-KE")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {(data.pipeline_by_stage?.length ?? 0) > 0 && (
            <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">Open pipeline by stage</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Stage</TableHead>
                      <TableHead className="text-right">Deals</TableHead>
                      <TableHead className="pr-4 text-right">Value (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pipeline_by_stage.map((row) => (
                      <TableRow key={row.stage}>
                        <TableCell className="pl-4 font-medium">{row.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">
                          {row.value.toLocaleString("en-KE")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <footer className="border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        Analytics share data with{" "}
        <Link href="/crm/reports" className="text-primary hover:underline">
          Sales reports
        </Link>{" "}
        (CSV exports). © {new Date().getFullYear()} BIBO Windows & Doors.
      </footer>
    </CrmPageContent>
  );
}
