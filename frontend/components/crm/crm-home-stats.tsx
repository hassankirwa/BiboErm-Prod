"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Handshake, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmHomeSummary } from "@/lib/api/crm/home";

const statConfig = [
  { key: "leads", label: "Open Leads", icon: Users, iconClassName: "bg-blue-100 text-blue-700" },
  { key: "deals", label: "Active Deals", icon: Handshake, iconClassName: "bg-violet-100 text-violet-700" },
  { key: "visits", label: "Site Visits", icon: CalendarCheck, iconClassName: "bg-orange-100 text-orange-700" },
  { key: "pipeline", label: "Pipeline (KES M)", icon: TrendingUp, iconClassName: "bg-emerald-100 text-emerald-700" },
] as const;

function formatStat(key: string, summary: CrmHomeSummary | null): string {
  if (!summary) return "—";

  if (key === "pipeline") {
    return (summary.stats.pipeline_value / 1_000_000).toFixed(2);
  }

  const value = summary.stats[key as keyof typeof summary.stats];
  return String(value ?? "—");
}

export function CrmHomeStats({ summary }: { summary: CrmHomeSummary | null }) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
      {statConfig.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.key}
            className="min-w-0 rounded-[10px] border-border/70 bg-card shadow-sm"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
                  stat.iconClassName,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold leading-none text-foreground">
                  {formatStat(stat.key, summary)}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Live from API</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
