"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QcProjectSummary } from "@/lib/api/qc";
import { formatProjectStage } from "@/lib/api/projects";
import { ExternalLink, MapPin, User } from "lucide-react";

type QcProjectSummaryCardProps = {
  project: QcProjectSummary;
  compact?: boolean;
};

export function QcProjectSummaryCard({ project, compact = false }: QcProjectSummaryCardProps) {
  const stageLabel = project.stage ? formatProjectStage(project.stage) : null;

  if (compact) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{project.name}</p>
            <p className="text-muted-foreground">{project.reference}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}`}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Project
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Project</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{project.reference}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}?tab=qc`}>
              <ExternalLink className="mr-1 h-4 w-4" />
              Open project
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-base">{project.name}</p>
          {project.account?.name && (
            <p className="text-muted-foreground">{project.account.name}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {stageLabel && <Badge variant="secondary">{stageLabel}</Badge>}
          {project.priority && (
            <Badge variant="outline" className="capitalize">
              {project.priority.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {typeof project.completion_percent === "number" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Completion</span>
              <span>{project.completion_percent}%</span>
            </div>
            <Progress value={project.completion_percent} className="h-2" />
          </div>
        )}

        {project.site_address && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{project.site_address}</span>
          </p>
        )}

        {project.project_manager && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>
              PM:{" "}
              <span className="text-foreground">{project.project_manager.name}</span>
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
