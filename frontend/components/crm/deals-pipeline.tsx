"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, CheckCircle } from "lucide-react";
import { fetchDeals } from "@/lib/api/crm/deals";
import type { ApiDeal } from "@/lib/api/crm/types";

function dealValue(deal: ApiDeal): number {
  return Number(deal.estimated_value ?? deal.amount ?? 0);
}

export function DealsPipeline() {
  const [deals, setDeals] = useState<ApiDeal[]>([]);

  useEffect(() => {
    fetchDeals({ per_page: 200 })
      .then((res) => setDeals(res.data ?? []))
      .catch(() => setDeals([]));
  }, []);

  const stats = useMemo(() => {
    const totalValue = deals.reduce((acc, d) => acc + dealValue(d), 0);
    const wonDeals = deals.filter((d) => (d.stage ?? d.status) === "closed_won");
    const wonValue = wonDeals.reduce((acc, d) => acc + dealValue(d), 0);
    const avgDealSize = deals.length ? totalValue / deals.length : 0;
    const weightedValue = deals.reduce(
      (acc, d) => acc + dealValue(d) * ((d.probability ?? 50) / 100),
      0,
    );

    return [
      {
        label: "Total Pipeline",
        value: `KES ${(totalValue / 1_000_000).toFixed(2)}M`,
        subtext: `${deals.length} deals`,
        icon: DollarSign,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        label: "Weighted Value",
        value: `KES ${(weightedValue / 1_000_000).toFixed(2)}M`,
        subtext: "Probability weighted",
        icon: Target,
        color: "text-info",
        bgColor: "bg-info/10",
      },
      {
        label: "Closed Won",
        value: `KES ${(wonValue / 1_000_000).toFixed(2)}M`,
        subtext: `${wonDeals.length} deals`,
        icon: CheckCircle,
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        label: "Avg Deal Size",
        value: `KES ${(avgDealSize / 1000).toFixed(0)}K`,
        subtext: "Per deal",
        icon: TrendingUp,
        color: "text-warning",
        bgColor: "bg-warning/10",
      },
    ];
  }, [deals]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{stat.subtext}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
