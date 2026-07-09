"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  Calendar,
  AlertCircle,
  MoreVertical,
  Eye,
  FileText,
  DollarSign,
} from "lucide-react";
import type { ProjectSummary } from "@/lib/api/projects";
import { projectDetailPath, type ProjectViewMode } from "@/lib/projects/paths";

const stageColors: Record<string, string> = {
  awaiting_deposit: "bg-muted text-muted-foreground",
  deposit_received: "bg-info/10 text-info",
  site_assessment: "bg-info/10 text-info",
  final_design_approval: "bg-info/10 text-info",
  bom_finalized: "bg-info/10 text-info",
  material_check: "bg-warning/10 text-warning",
  materials_reserved: "bg-warning/10 text-warning",
  awaiting_procurement: "bg-warning/10 text-warning",
  materials_ready: "bg-success/10 text-success",
  materials_released: "bg-success/10 text-success",
  cutting_stage: "bg-primary/10 text-primary",
  fabrication_stage: "bg-primary/10 text-primary",
  glass_assembly: "bg-primary/10 text-primary",
  qc_pre_installation: "bg-chart-4/10 text-chart-4",
  in_transit: "bg-chart-5/10 text-chart-5",
  installation: "bg-chart-5/10 text-chart-5",
  site_qc: "bg-chart-4/10 text-chart-4",
  snagging: "bg-warning/10 text-warning",
  project_complete: "bg-success/10 text-success",
};

const priorityColors: Record<string, string> = {
  normal: "bg-secondary text-secondary-foreground",
  urgent: "bg-destructive/10 text-destructive",
  apartment_block: "bg-primary/10 text-primary",
};

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type ProjectsGridProps = {
  projects: ProjectSummary[];
  loading?: boolean;
  viewMode?: ProjectViewMode;
};

export function ProjectsGrid({
  projects,
  loading = false,
  viewMode = "projects",
}: ProjectsGridProps) {
  if (loading) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No projects to display.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const projectedEnd = project.projected_end ? new Date(project.projected_end) : null;
        const isDelayed =
          projectedEnd !== null &&
          projectedEnd < new Date() &&
          project.stage !== "project_complete";
        const daysRemaining =
          projectedEnd !== null
            ? Math.ceil(
                (projectedEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )
            : null;
        const quotedAmount = Number(project.quoted_amount ?? 0);
        const depositReceived = Number(project.deposit_received ?? 0);

        return (
          <Card key={project.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {project.name}
                    </h3>
                    {isDelayed && (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{project.reference}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={projectDetailPath(project.id, viewMode)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={projectDetailPath(project.id, viewMode, { tab: "bom" })}>
                        <FileText className="mr-2 h-4 w-4" />
                        View BOM
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={priorityColors[project.priority] ?? priorityColors.normal}
                  variant="secondary"
                >
                  {project.priority.replace("_", " ")}
                </Badge>
                <Badge
                  className={stageColors[project.stage] ?? "bg-muted text-muted-foreground"}
                  variant="secondary"
                >
                  {formatStage(project.stage)}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.site_address || "Site not set"}
                  {project.location_type === "nairobi" ? (
                    <Badge variant="outline" className="text-[10px] h-4">
                      Nairobi (fab → install)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4">
                      Outside Nairobi
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Due: {project.projected_end ? new Date(project.projected_end).toLocaleDateString() : "TBD"}
                  {daysRemaining !== null && daysRemaining > 0 && (
                    <span className="text-success">({daysRemaining} days left)</span>
                  )}
                  {daysRemaining !== null && daysRemaining < 0 && (
                    <span className="text-destructive">({Math.abs(daysRemaining)} days overdue)</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.completion_percent}%</span>
                </div>
                <Progress value={project.completion_percent} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  KES {(quotedAmount / 1000).toFixed(0)}K
                </div>
                <div className="text-muted-foreground">
                  Deposit: {quotedAmount > 0 ? Math.round((depositReceived / quotedAmount) * 100) : 0}%
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
