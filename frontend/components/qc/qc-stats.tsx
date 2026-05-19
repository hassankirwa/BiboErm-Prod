"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const stats = [
  {
    title: "Total Inspections",
    value: "248",
    change: "+12 this week",
    icon: ClipboardCheck,
    trend: "up",
  },
  {
    title: "Pass Rate",
    value: "94.2%",
    change: "+2.1% vs last month",
    icon: CheckCircle2,
    trend: "up",
  },
  {
    title: "Pending Review",
    value: "18",
    change: "5 urgent",
    icon: Clock,
    trend: "neutral",
  },
  {
    title: "NCRs Open",
    value: "7",
    change: "-3 this week",
    icon: AlertTriangle,
    trend: "down",
  },
];

export function QCStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                <p className={`text-xs ${
                  stat.trend === "up" 
                    ? "text-green-600" 
                    : stat.trend === "down" 
                    ? "text-red-600" 
                    : "text-muted-foreground"
                }`}>
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
