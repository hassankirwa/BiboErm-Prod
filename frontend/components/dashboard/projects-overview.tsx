import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockProjects } from "@/lib/data/projects";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";

const stageColors: Record<string, string> = {
  awaiting_deposit: "bg-muted text-muted-foreground",
  deposit_received: "bg-info/10 text-info",
  site_assessment: "bg-info/10 text-info",
  design_approval: "bg-info/10 text-info",
  bom_finalized: "bg-info/10 text-info",
  material_check: "bg-warning/10 text-warning",
  materials_reserved: "bg-warning/10 text-warning",
  awaiting_procurement: "bg-warning/10 text-warning",
  materials_ready: "bg-success/10 text-success",
  cutting: "bg-primary/10 text-primary",
  fabrication: "bg-primary/10 text-primary",
  glass_assembly: "bg-primary/10 text-primary",
  qc_pre_installation: "bg-chart-4/10 text-chart-4",
  in_transit: "bg-chart-5/10 text-chart-5",
  installation: "bg-chart-5/10 text-chart-5",
  site_qc: "bg-chart-4/10 text-chart-4",
  snagging: "bg-warning/10 text-warning",
  complete: "bg-success/10 text-success",
};

const priorityColors: Record<string, string> = {
  standard: "bg-secondary text-secondary-foreground",
  urgent: "bg-destructive/10 text-destructive",
  apartment_block: "bg-primary/10 text-primary",
};

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ProjectsOverview() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockProjects.slice(0, 4).map((project) => {
            const isDelayed =
              new Date(project.projectedCompletionDate) < new Date() &&
              project.stage !== "complete";

            return (
              <div
                key={project.id}
                className="flex flex-col gap-3 p-4 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {project.name}
                      </h4>
                      {isDelayed && (
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.projectedCompletionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={priorityColors[project.priority]} variant="secondary">
                      {project.priority.replace("_", " ")}
                    </Badge>
                    <Badge className={stageColors[project.stage]} variant="secondary">
                      {formatStage(project.stage)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={project.percentComplete} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                    {project.percentComplete}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Value: KES {(project.totalValue / 1000).toFixed(0)}K
                  </span>
                  <span>
                    Deposit: KES {(project.depositAmount / 1000).toFixed(0)}K (
                    {Math.round((project.depositAmount / project.totalValue) * 100)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
