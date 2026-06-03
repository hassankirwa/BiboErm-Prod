"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { SiteAssessmentForm } from "@/components/projects/site-assessment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  formatProjectStage,
  getProject,
  hasSiteAssessmentOperationalData,
  type ProjectDetail,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { ChevronLeft } from "lucide-react";

const STAGES_BEFORE_SITE_ASSESSMENT = new Set([
  "awaiting_deposit",
  "deposit_received",
]);

export default function ProjectSiteAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = Number(id);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(projectId) || projectId <= 0) {
      setError("Invalid project id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getProject(projectId)
      .then((response) => {
        if (!cancelled) setProject(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load project.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader
          title="Site assessment"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="p-6 text-sm text-destructive">{error ?? "Project not found."}</div>
      </div>
    );
  }

  const isEditable = project.stage === "site_assessment";
  const isTooEarly = STAGES_BEFORE_SITE_ASSESSMENT.has(project.stage);
  const hasSavedData = hasSiteAssessmentOperationalData(project.stage_data?.site_assessment);
  const canView = isEditable || hasSavedData;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Site assessment"
        subtitle={`${project.name} · ${formatProjectStage(project.stage)}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to project
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        <div className="mx-auto w-full max-w-7xl">
          {isTooEarly ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Not available yet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Site assessment opens once the project reaches the site assessment stage.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}`}>Return to project</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !canView ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No site assessment recorded</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>No operational site assessment has been saved for this project yet.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}`}>Return to project</Link>
                </Button>
              </CardContent>
            </Card>
          ) : isEditable ? (
            <PermissionGate
              anyOf={[
                "projects.site_assessment_notes",
                "projects.advance_stage",
                "projects.manage",
              ]}
              fallback={
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Access denied</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    You do not have permission to record site assessment data.
                  </CardContent>
                </Card>
              }
            >
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Opening measurements & notes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Width and height are recorded in feet (decimals allowed, e.g. 3.5).
                  </p>
                </CardHeader>
                <CardContent>
                  <SiteAssessmentForm
                    project={project}
                    onProjectUpdated={setProject}
                  />
                </CardContent>
              </Card>
            </PermissionGate>
          ) : (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Opening measurements & notes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Width and height are recorded in feet (decimals allowed, e.g. 3.5).
                </p>
              </CardHeader>
              <CardContent>
                <SiteAssessmentForm project={project} readOnly />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
