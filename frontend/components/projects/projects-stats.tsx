import { Card, CardContent } from "@/components/ui/card";
import { mockProjects } from "@/lib/mock-data";
import { FolderKanban, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const activeProjects = mockProjects.filter((p) => p.stage !== "complete");
const onTimeProjects = activeProjects.filter(
  (p) => new Date(p.projectedCompletionDate) >= new Date()
);
const delayedProjects = activeProjects.filter(
  (p) => new Date(p.projectedCompletionDate) < new Date()
);
const completedProjects = mockProjects.filter((p) => p.stage === "complete");

const stats = [
  {
    label: "Active Projects",
    value: activeProjects.length,
    icon: FolderKanban,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "On Schedule",
    value: onTimeProjects.length,
    icon: Clock,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    label: "Delayed",
    value: delayedProjects.length,
    icon: AlertTriangle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    label: "Completed",
    value: completedProjects.length,
    icon: CheckCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

export function ProjectsStats() {
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
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
