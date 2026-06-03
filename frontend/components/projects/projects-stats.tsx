import { Card, CardContent } from "@/components/ui/card";
import type { ProjectsDashboard } from "@/lib/api/projects";
import { FolderKanban, Clock, AlertTriangle, CheckCircle } from "lucide-react";

type ProjectsStatsProps = {
  dashboard: ProjectsDashboard | null;
  loading?: boolean;
};

export function ProjectsStats({ dashboard, loading = false }: ProjectsStatsProps) {
  const stats = [
    {
      label: "Active Projects",
      value: dashboard ? dashboard.total_projects - dashboard.completed : 0,
      icon: FolderKanban,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Queued",
      value: dashboard?.queued ?? 0,
      icon: Clock,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Awaiting Procurement",
      value: dashboard?.awaiting_procurement ?? 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Completed",
      value: dashboard?.completed ?? 0,
      icon: CheckCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
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
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "..." : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
