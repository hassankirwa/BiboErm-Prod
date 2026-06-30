"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchDesignQueueProjects,
  type DesignQueueProject,
} from "@/lib/api/projects/design";
import { ApiError } from "@/lib/api/errors";
import { projectSiteAssessmentPath, projectTabPath } from "@/lib/projects/paths";
import { cn } from "@/lib/utils";
import { ExternalLink, Layers, PencilRuler, Upload } from "lucide-react";
import { toast } from "sonner";

const STAGE_BADGE_CLASS: Record<string, string> = {
  deposit_received: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  site_assessment: "bg-warning/10 text-warning border-warning/20",
  final_design_approval: "bg-primary/10 text-primary border-primary/20",
};

function formatKes(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return `KES ${num.toLocaleString("en-KE")}`;
}

function primaryAction(project: DesignQueueProject): {
  label: string;
  href: string;
  icon: typeof PencilRuler;
} | null {
  if (!project.has_production_measurement) {
    return {
      label: "Production measurements",
      href: projectSiteAssessmentPath(project.id, "projects"),
      icon: PencilRuler,
    };
  }

  if (!project.has_design_document) {
    return {
      label: "Upload WINCAD",
      href: projectTabPath(project.id, "designs", "projects"),
      icon: Upload,
    };
  }

  return {
    label: "View designs",
    href: projectTabPath(project.id, "designs", "projects"),
    icon: Upload,
  };
}

function secondaryAction(project: DesignQueueProject): {
  label: string;
  href: string;
} | null {
  if (!project.has_production_measurement) {
    return null;
  }

  return {
    label: "View measurements",
    href: projectSiteAssessmentPath(project.id, "projects"),
  };
}

export default function ProjectDesignPage() {
  const [projects, setProjects] = useState<DesignQueueProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setProjects(await fetchDesignQueueProjects());
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load design queue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Design"
        subtitle="After production measurements, upload WINCAD and design files per project"
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Design Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No projects are in the design phase. Projects appear here after deposit is
                received.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Measurements</TableHead>
                    <TableHead>Design files</TableHead>
                    <TableHead>PM</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const action = primaryAction(project);
                    const secondary = secondaryAction(project);
                    const ActionIcon = action?.icon ?? PencilRuler;

                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {project.reference} · {formatKes(project.quoted_amount)}
                          </div>
                        </TableCell>
                        <TableCell>{project.account?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              STAGE_BADGE_CLASS[project.stage] ??
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {project.stage_label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              project.has_production_measurement ? "default" : "outline"
                            }
                          >
                            {project.has_production_measurement ? "Done" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={project.has_design_document ? "default" : "outline"}
                          >
                            {project.has_design_document ? "Uploaded" : "Missing"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.project_manager?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={projectTabPath(project.id, "overview", "projects")}>
                                View
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button size="sm" asChild>
                              <Link href={action?.href ?? projectTabPath(project.id, "overview", "projects")}>
                                <ActionIcon className="mr-1.5 h-3.5 w-3.5" />
                                {action?.label ?? "Open"}
                              </Link>
                            </Button>
                            {secondary ? (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={secondary.href}>{secondary.label}</Link>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
