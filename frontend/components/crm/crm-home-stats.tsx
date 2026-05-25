"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Handshake, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchLeads } from "@/lib/api/crm/leads";
import { fetchDeals } from "@/lib/api/crm/deals";
import { fetchSiteVisits } from "@/lib/api/crm/site-visits";

const statConfig = [
  { key: "leads", label: "Open Leads", icon: Users, iconClassName: "bg-blue-100 text-blue-700" },
  { key: "deals", label: "Active Deals", icon: Handshake, iconClassName: "bg-violet-100 text-violet-700" },
  { key: "visits", label: "Site Visits", icon: CalendarCheck, iconClassName: "bg-orange-100 text-orange-700" },
  { key: "pipeline", label: "Pipeline (KES M)", icon: TrendingUp, iconClassName: "bg-emerald-100 text-emerald-700" },
] as const;

export function CrmHomeStats() {
  const [stats, setStats] = useState<Record<string, string>>({
    leads: "—",
    deals: "—",
    visits: "—",
    pipeline: "—",
  });

  useEffect(() => {
    Promise.all([
      fetchLeads({ per_page: 1 }),
      fetchDeals({ per_page: 200 }),
      fetchSiteVisits({ per_page: 1 }),
    ])
      .then(([leadsRes, dealsRes, visitsRes]) => {
        const deals = dealsRes.data ?? [];
        const pipeline = deals.reduce(
          (sum, d) => sum + Number(d.estimated_value ?? d.amount ?? 0),
          0,
        );
        setStats({
          leads: String(leadsRes.meta?.total ?? leadsRes.data.length),
          deals: String(dealsRes.meta?.total ?? deals.length),
          visits: String(visitsRes.meta?.total ?? visitsRes.data.length),
          pipeline: (pipeline / 1_000_000).toFixed(2),
        });
      })
      .catch(() => {});
  }, []);

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
                  {stats[stat.key]}
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
