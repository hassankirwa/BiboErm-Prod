"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Briefcase,
  Coins,
  FileText,
  MapPin,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatKes, formatKesFull } from "@/lib/leads-kanban-data";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import {
  fetchCrmReportsDashboard,
  type CrmReportDashboard,
} from "@/lib/api/crm/reports";

const SOURCE_COLORS = ["#2563eb", "#ec2024", "#16a34a", "#f59e0b", "#8b5cf6", "#64748b"];
const STAGE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#16a34a", "#f59e0b", "#8b5cf6", "#64748b"];

function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {hint && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                <TrendingUp className="h-3 w-3 shrink-0" />
                {hint}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CrmSalesReportsDashboard() {
  const [from, setFrom] = useState(monthStartIso);
  const [to, setTo] = useState(todayIso);
  const [ownerId, setOwnerId] = useState<string>("all");
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState<CrmReportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCrmAssignableUsers({ role: "sales_representative" })
      .then((res) => setOwners(res.data.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const dashboard = await fetchCrmReportsDashboard({
        from,
        to,
        owner_id: ownerId === "all" ? undefined : ownerId,
      });
      setData(dashboard);
    } catch {
      setError("Could not load sales reports. Check your connection and try again.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to, ownerId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = data?.kpis;

  const kpiCards = useMemo(
    () => [
      {
        label: "Total Leads",
        value: String(kpis?.total_leads ?? 0),
        hint: kpis ? `${kpis.lead_conversion_rate}% converted` : undefined,
        icon: Users,
      },
      {
        label: "Pipeline Value",
        value: formatKes(kpis?.pipeline_value ?? 0),
        hint: kpis ? `${kpis.open_deals} open deals` : undefined,
        icon: Briefcase,
      },
      {
        label: "Won Revenue",
        value: formatKes(kpis?.won_revenue ?? 0),
        hint: kpis ? `${kpis.win_rate}% win rate` : undefined,
        icon: Coins,
      },
      {
        label: "Payments Received",
        value: formatKes(kpis?.payments_received ?? 0),
        hint: kpis ? `${kpis.won_deals} won / ${kpis.lost_deals} lost` : undefined,
        icon: Target,
      },
      {
        label: "Quotations",
        value: String(kpis?.quotations_accepted ?? 0),
        hint: kpis ? `${kpis.quotations_sent} sent in period` : undefined,
        icon: FileText,
      },
      {
        label: "Activities",
        value: String(kpis?.activities_completed ?? 0),
        hint: kpis ? `${kpis.activities_total} logged in period` : undefined,
        icon: Activity,
      },
      {
        label: "Site Visits",
        value: String(kpis?.site_visits ?? 0),
        hint: "Scheduled in period",
        icon: MapPin,
      },
      {
        label: "Avg Deal Size",
        value: formatKes(kpis?.avg_deal_size ?? 0),
        hint: kpis ? `${kpis.deals_created} deals created` : undefined,
        icon: TrendingUp,
      },
    ],
    [kpis],
  );

  const pipelineChartData = useMemo(
    () =>
      (data?.pipeline_by_stage ?? []).map((row, index) => ({
        name: row.label,
        count: row.count,
        value: row.value,
        fill: STAGE_COLORS[index % STAGE_COLORS.length],
      })),
    [data?.pipeline_by_stage],
  );

  const leadsBySource = useMemo(
    () =>
      (data?.leads_by_source ?? []).map((row, index) => ({
        name: row.label,
        value: row.count,
        fill: SOURCE_COLORS[index % SOURCE_COLORS.length],
      })),
    [data?.leads_by_source],
  );

  const leadsByStatus = data?.leads_by_status ?? [];
  const activitiesByType = data?.activities_by_type ?? [];
  const quotationsByStatus = data?.quotations_by_status ?? [];
  const topPerformers = data?.top_performers ?? [];
  const hasChartData = pipelineChartData.length > 0 || leadsBySource.length > 0;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              className="h-9 w-[150px] rounded-[5px]"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              className="h-9 w-[150px] rounded-[5px]"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Owner</label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="h-9 w-[180px] rounded-[5px] border-border bg-background text-sm">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={String(owner.id)}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-[5px]"
            disabled={loading || refreshing}
            onClick={() => loadDashboard(true)}
            aria-label="Refresh reports"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        {data?.period && (
          <p className="text-sm text-muted-foreground">
            Showing data for{" "}
            <span className="font-medium text-foreground">
              {data.period.from} to {data.period.to}
            </span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Reports unavailable</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => loadDashboard()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>

          {!hasChartData && (kpis?.total_leads ?? 0) === 0 && (kpis?.open_deals ?? 0) === 0 ? (
            <Card className="rounded-[10px] border-border/80 bg-card shadow-sm">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No CRM activity found for the selected period and filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-12">
              <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-7">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  {pipelineChartData.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No open deals in pipeline.
                    </p>
                  ) : (
                    <div className="h-[280px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => formatKes(Number(v))} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number, _name, item) => [
                              `${formatKesFull(Number(value))} (${item.payload.count} deals)`,
                              "Value",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {pipelineChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-5">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold">Leads by Source</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  {leadsBySource.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No leads in selected period.
                    </p>
                  ) : (
                    <>
                      <div className="h-[220px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={leadsBySource}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={82}
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
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-sm font-semibold text-foreground">
                        {kpis?.total_leads ?? 0}{" "}
                        <span className="font-normal text-muted-foreground">Total Leads</span>
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-4">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold">Lead Funnel</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto px-0 pb-4">
                  {leadsByStatus.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No lead status data.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-4">Status</TableHead>
                          <TableHead className="pr-4 text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsByStatus.map((row) => (
                          <TableRow key={row.status}>
                            <TableCell className="pl-4">{row.label}</TableCell>
                            <TableCell className="pr-4 text-right font-medium">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-4">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold">Activity Summary</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto px-0 pb-4">
                  {activitiesByType.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No activities logged in period.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-4">Type</TableHead>
                          <TableHead className="pr-4 text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activitiesByType.map((row) => (
                          <TableRow key={row.type}>
                            <TableCell className="pl-4">{row.label}</TableCell>
                            <TableCell className="pr-4 text-right font-medium">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-4">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold">Quotation Stats</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto px-0 pb-4">
                  {quotationsByStatus.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No quotations in period.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-4">Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="pr-4 text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotationsByStatus.map((row) => (
                          <TableRow key={row.status}>
                            <TableCell className="pl-4">{row.label}</TableCell>
                            <TableCell className="text-right">{row.count}</TableCell>
                            <TableCell className="pr-4 text-right font-medium">
                              {formatKes(row.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-12">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold">Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto px-0 pb-4">
                  {topPerformers.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No won deals in selected period.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10 pl-4">#</TableHead>
                          <TableHead>Rep</TableHead>
                          <TableHead className="text-right">Won Deals</TableHead>
                          <TableHead className="pr-4 text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topPerformers.map((rep, index) => (
                          <TableRow key={`${rep.owner_id ?? "none"}-${rep.name}`}>
                            <TableCell className="pl-4 text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">{rep.name}</TableCell>
                            <TableCell className="text-right">{rep.won_deals}</TableCell>
                            <TableCell className="pr-4 text-right tabular-nums font-medium">
                              {formatKesFull(rep.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
