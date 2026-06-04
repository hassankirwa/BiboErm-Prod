"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, Clock, CheckCircle, Archive } from "lucide-react";

type QcDefectStatsProps = {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  waivedCount: number;
  loading?: boolean;
};

export function QcDefectStats({
  openCount,
  inProgressCount,
  resolvedCount,
  waivedCount,
  loading,
}: QcDefectStatsProps) {
  const stats = [
    {
      title: "Open",
      value: loading ? "…" : String(openCount),
      description: "Needs attention",
      icon: AlertOctagon,
      iconColor: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "In progress",
      value: loading ? "…" : String(inProgressCount),
      description: "Being resolved",
      icon: Clock,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Resolved",
      value: loading ? "…" : String(resolvedCount),
      description: "Closed successfully",
      icon: CheckCircle,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Waived",
      value: loading ? "…" : String(waivedCount),
      description: "Accepted exceptions",
      icon: Archive,
      iconColor: "text-muted-foreground",
      bgColor: "bg-muted",
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
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
              <div className={`h-10 w-10 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
