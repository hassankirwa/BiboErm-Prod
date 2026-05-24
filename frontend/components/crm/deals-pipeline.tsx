import { Card, CardContent } from "@/components/ui/card";
import { mockDeals } from "@/lib/data/crm";
import { TrendingUp, DollarSign, Target, CheckCircle } from "lucide-react";

const totalValue = mockDeals.reduce((acc, d) => acc + d.value, 0);
const wonDeals = mockDeals.filter((d) => d.stage === "closed_won");
const wonValue = wonDeals.reduce((acc, d) => acc + d.value, 0);
const avgDealSize = totalValue / mockDeals.length;
const weightedValue = mockDeals.reduce(
  (acc, d) => acc + d.value * (d.probability / 100),
  0
);

const stats = [
  {
    label: "Total Pipeline",
    value: `KES ${(totalValue / 1000000).toFixed(2)}M`,
    subtext: `${mockDeals.length} deals`,
    icon: DollarSign,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Weighted Value",
    value: `KES ${(weightedValue / 1000000).toFixed(2)}M`,
    subtext: "Probability weighted",
    icon: Target,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    label: "Closed Won",
    value: `KES ${(wonValue / 1000000).toFixed(2)}M`,
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

export function DealsPipeline() {
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
