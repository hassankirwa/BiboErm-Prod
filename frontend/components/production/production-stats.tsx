import { Card, CardContent } from "@/components/ui/card";
import { mockProductionOrders } from "@/lib/data/production";
import { Factory, Scissors, Wrench, CheckCircle } from "lucide-react";

const stats = [
  {
    label: "In Production",
    value: mockProductionOrders.length,
    subtext: "Active orders",
    icon: Factory,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Cutting",
    value: mockProductionOrders.filter((o) => o.stage === "cutting").length,
    subtext: "In cutting stage",
    icon: Scissors,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    label: "Fabrication",
    value: mockProductionOrders.filter((o) => o.stage === "fabrication").length,
    subtext: "Assembly in progress",
    icon: Wrench,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    label: "Ready for QC",
    value: mockProductionOrders.filter((o) => o.stage === "qc_post_fabrication").length,
    subtext: "Awaiting inspection",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function ProductionStats() {
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
