"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Briefcase,
  Coins,
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
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
import { cn } from "@/lib/utils";
import { CrmPageContent } from "@/components/crm/crm-page-shell";
import {
  LeadGenerationTargetChart,
  RevenueTargetChart,
} from "@/components/crm/crm-analytics-target-charts";
import { fetchLeads } from "@/lib/api/crm/leads";
import { fetchDeals } from "@/lib/api/crm/deals";
import { fetchAccounts } from "@/lib/api/crm/accounts";

const kpiIcons = {
  users: Users,
  coin: Coins,
  briefcase: Briefcase,
  building: Building2,
} as const;

const SOURCE_COLORS = ["#2563eb", "#ec2024", "#16a34a", "#f59e0b", "#8b5cf6", "#64748b"];

export function CrmAnalyticsDashboard() {
  const [leadCount, setLeadCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [accountCount, setAccountCount] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [wonRevenue, setWonRevenue] = useState(0);
  const [leadsBySource, setLeadsBySource] = useState<
    { name: string; value: number; fill: string }[]
  >([]);

  useEffect(() => {
    Promise.all([
      fetchLeads({ per_page: 200 }),
      fetchDeals({ per_page: 200 }),
      fetchAccounts({ per_page: 200 }),
    ]).then(([leadsRes, dealsRes, accountsRes]) => {
      const leads = leadsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      setLeadCount(leadsRes.meta?.total ?? leads.length);
      setDealCount(dealsRes.meta?.total ?? deals.length);
      setAccountCount(accountsRes.meta?.total ?? (accountsRes.data ?? []).length);
      setPipelineValue(
        deals.reduce((s, d) => s + Number(d.estimated_value ?? d.amount ?? 0), 0),
      );
      setWonRevenue(
        deals
          .filter((d) => (d.stage ?? d.status) === "closed_won")
          .reduce((s, d) => s + Number(d.estimated_value ?? d.amount ?? 0), 0),
      );

      const bySource = new Map<string, number>();
      for (const lead of leads) {
        const src = lead.source ?? lead.lead_source?.label ?? "Other";
        bySource.set(src, (bySource.get(src) ?? 0) + 1);
      }
      setLeadsBySource(
        [...bySource.entries()].map(([name, value], i) => ({
          name,
          value,
          fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
        })),
      );
    }).catch(() => {});
  }, []);

  const kpis = useMemo(
    () => [
      {
        label: "Total Leads",
        value: String(leadCount),
        change: "Live",
        previous: "—",
        icon: "users" as const,
      },
      {
        label: "Pipeline Value",
        value: `KES ${(pipelineValue / 1_000_000).toFixed(2)}M`,
        change: "Live",
        previous: "—",
        icon: "coin" as const,
      },
      {
        label: "Open Deals",
        value: String(dealCount),
        change: "Live",
        previous: "—",
        icon: "briefcase" as const,
      },
      {
        label: "Accounts",
        value: String(accountCount),
        change: "Live",
        previous: "—",
        icon: "building" as const,
      },
    ],
    [leadCount, pipelineValue, dealCount, accountCount],
  );

  const performanceRows = useMemo(
    () => [
      { metric: "Leads", mar: "—", apr: "—", may: String(leadCount), highlightMay: true },
      { metric: "Deals", mar: "—", apr: "—", may: String(dealCount), highlightMay: false },
      {
        metric: "Won Revenue (KES)",
        mar: "—",
        apr: "—",
        may: wonRevenue.toLocaleString(),
        highlightMay: true,
      },
    ],
    [leadCount, dealCount, wonRevenue],
  );

  const topReps = useMemo(() => {
    return [{ rank: 1, name: "Team total", revenue: wonRevenue.toLocaleString() }];
  }, [wonRevenue]);

  return (
    <CrmPageContent>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-[120px] rounded-[5px] border-border bg-background text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="mine">Mine</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="org">
            <SelectTrigger className="h-9 w-[160px] rounded-[5px] border-border bg-background text-sm">
              <SelectValue placeholder="Org Overview" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org">Org Overview</SelectItem>
              <SelectItem value="sales">Sales Team</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-[5px]">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-[5px] text-sm font-medium">
            Add Component
          </Button>
          <Button size="sm" className="h-9 rounded-[5px] text-sm font-medium">
            Create Dashboard
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-[5px]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
                      {kpi.change}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last month: <span className="font-medium text-foreground">{kpi.previous}</span>
                    </p>
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

      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <LeadGenerationTargetChart current={leadCount} target={Math.max(leadCount, 100)} />
        <RevenueTargetChart achieved={wonRevenue} target={Math.max(pipelineValue, 1_000_000)} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-12">
        <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">
              Last 3 Months Performance Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Metric</TableHead>
                  <TableHead className="text-right">Mar 2026</TableHead>
                  <TableHead className="text-right">Apr 2026</TableHead>
                  <TableHead className="pr-4 text-right">May 2026</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceRows.map((row) => (
                  <TableRow key={row.metric}>
                    <TableCell className="pl-4 font-medium">{row.metric}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.mar}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.apr}</TableCell>
                    <TableCell
                      className={cn(
                        "pr-4 text-right font-medium",
                        row.highlightMay && "text-primary"
                      )}
                    >
                      {row.may}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-4">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Leads By Source</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsBySource.length ? leadsBySource : [{ name: "No data", value: 1, fill: "#e5e7eb" }]}
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
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-sm font-semibold text-foreground">
              {leadCount}{" "}
              <span className="font-normal text-muted-foreground">Total Leads</span>
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-[10px] border-border/80 bg-card shadow-sm xl:col-span-3">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Prolific Sales Reps</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="pr-4 text-right">Won Revenue (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReps.map((rep) => (
                  <TableRow key={rep.name}>
                    <TableCell className="pl-4 text-muted-foreground">{rep.rank}</TableCell>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums font-medium text-foreground">
                      {rep.revenue}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <footer className="border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BIBO Windows & Doors. All rights reserved.
      </footer>
    </CrmPageContent>
  );
}
