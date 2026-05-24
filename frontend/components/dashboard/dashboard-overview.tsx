import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Package,
  Factory,
  ClipboardCheck,
} from "lucide-react";
import { mockDashboardMetrics } from "@/lib/data/dashboard";

const metrics = [
  {
    title: "Active Projects",
    value: mockDashboardMetrics.activeProjects,
    icon: FolderKanban,
    description: `${mockDashboardMetrics.projectsOnTime} on time, ${mockDashboardMetrics.projectsDelayed} delayed`,
    trend: "neutral",
  },
  {
    title: "Leads This Month",
    value: mockDashboardMetrics.leadsThisMonth,
    icon: Users,
    description: `${mockDashboardMetrics.dealsWonThisMonth} deals won`,
    trend: "up",
  },
  {
    title: "Revenue (MTD)",
    value: `KES ${(mockDashboardMetrics.revenueThisMonth / 1000000).toFixed(2)}M`,
    icon: DollarSign,
    description: "This month",
    trend: "up",
  },
  {
    title: "Outstanding",
    value: `KES ${(mockDashboardMetrics.outstandingPayments / 1000000).toFixed(2)}M`,
    icon: TrendingUp,
    description: "Pending payments",
    trend: "neutral",
  },
  {
    title: "Low Stock Items",
    value: mockDashboardMetrics.lowStockItems,
    icon: Package,
    description: "Need restock",
    trend: mockDashboardMetrics.lowStockItems > 0 ? "warning" : "neutral",
  },
  {
    title: "Production",
    value: mockDashboardMetrics.productionInProgress,
    icon: Factory,
    description: "In progress",
    trend: "neutral",
  },
  {
    title: "QC Pending",
    value: mockDashboardMetrics.pendingQCInspections,
    icon: ClipboardCheck,
    description: "Awaiting inspection",
    trend: mockDashboardMetrics.pendingQCInspections > 2 ? "warning" : "neutral",
  },
  {
    title: "Alerts",
    value: 2,
    icon: AlertTriangle,
    description: "Require attention",
    trend: "warning",
  },
];

export function DashboardOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon
                className={`h-4 w-4 ${
                  metric.trend === "warning"
                    ? "text-warning"
                    : metric.trend === "up"
                    ? "text-success"
                    : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
