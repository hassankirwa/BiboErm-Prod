"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, Clock, CheckCircle, Archive } from "lucide-react";

const stats = [
  {
    title: "Open NCRs",
    value: "7",
    description: "2 critical",
    icon: AlertOctagon,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    title: "In Progress",
    value: "12",
    description: "Being resolved",
    icon: Clock,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Resolved This Month",
    value: "34",
    description: "+8 vs last month",
    icon: CheckCircle,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Closed (YTD)",
    value: "156",
    description: "Total resolved",
    icon: Archive,
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

export function NCRStats() {
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
