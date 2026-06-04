"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Factory, Scissors, Wrench, CheckCircle } from "lucide-react";
import type { ProductionOrder } from "@/lib/api/production";
import { isAssemblyQueueOrder, isCuttingQueueOrder } from "@/lib/production/utils";

type Props = {
  orders: ProductionOrder[];
};

export function ProductionStats({ orders }: Props) {
  const active = orders.filter(
    (o) => o.status === "scheduled" || o.status === "in_progress",
  );

  const stats = [
    {
      label: "In Production",
      value: active.length,
      subtext: "Active orders",
      icon: Factory,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Cutting",
      value: active.filter(isCuttingQueueOrder).length,
      subtext: "Cutting queue",
      icon: Scissors,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Assembly",
      value: active.filter(isAssemblyQueueOrder).length,
      subtext: "Fabrication & assembly",
      icon: Wrench,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Ready for QC",
      value: active.filter((o) => o.current_stage === "qc_post_fabrication").length,
      subtext: "Post-fabrication QC",
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
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
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
