"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { QcDashboardSummary } from "@/lib/api/qc";

type QCStatsProps = {
  summary?: QcDashboardSummary | null;
  loading?: boolean;
};

export function QCStats({ summary, loading }: QCStatsProps) {
  const pending = summary?.pending_inspections_count ?? 0;
  const openDefects = summary?.open_defects_count ?? 0;
  const failRate = summary?.fail_rate_30d ?? summary?.fail_rate_percent ?? 0;
  const thisWeek = summary?.inspections_this_week ?? 0;
  const passRate = failRate > 0 ? (100 - failRate).toFixed(1) : "—";

  const stats = [
    {
      title: "Inspections this week",
      value: loading ? "…" : String(thisWeek),
      change: "Created in the last 7 days",
      icon: ClipboardCheck,
      trend: "neutral" as const,
    },
    {
      title: "Pass rate (30d)",
      value: loading ? "…" : passRate === "—" ? "—" : `${passRate}%`,
      change: loading ? "" : `${failRate.toFixed(1)}% fail rate`,
      icon: CheckCircle2,
      trend: failRate <= 10 ? ("up" as const) : ("down" as const),
    },
    {
      title: "Pending review",
      value: loading ? "…" : String(pending),
      change: "Awaiting submit",
      icon: Clock,
      trend: "neutral" as const,
    },
    {
      title: "Open defects",
      value: loading ? "…" : String(openDefects),
      change: "Open or in progress",
      icon: AlertTriangle,
      trend: openDefects > 0 ? ("down" as const) : ("up" as const),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                <p
                  className={`text-xs ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : stat.trend === "down"
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
