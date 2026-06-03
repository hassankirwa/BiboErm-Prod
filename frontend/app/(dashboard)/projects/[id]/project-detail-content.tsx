"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ProjectDetailActionBar } from "@/components/projects/project-detail-action-bar";
import { ProjectDetailBom } from "@/components/projects/project-detail-bom";
import { ProjectDetailDesigns } from "@/components/projects/project-detail-designs";
import { ProjectDetailOverview } from "@/components/projects/project-detail-overview";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatProjectStage,
  getProject,
  hasSiteAssessmentOperationalData,
  type ProjectDetail,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { ChevronLeft, ClipboardList, Upload } from "lucide-react";
import { toast } from "sonner";

type ProjectTab = "overview" | "bom" | "designs";

function parseProjectTab(tab: string | null): ProjectTab {
  if (tab === "bom" || tab === "designs") return tab;
  return "overview";
}

export function ProjectDetailLoading() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    </div>
  );
}

export function ProjectDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseProjectTab(searchParams.get("tab"));
  const savedFlag = searchParams.get("saved");
  const projectId = Number(id);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designUploadTrigger, setDesignUploadTrigger] = useState(0);

  function setActiveTab(tab: ProjectTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(
      query ? `/projects/${projectId}?${query}` : `/projects/${projectId}`,
      { scroll: false },
    );
  }

  function handleUploadDesignClick() {
    if (activeTab === "designs") {
      setDesignUploadTrigger((count) => count + 1);
    } else {
      setActiveTab("designs");
    }
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  useEffect(() => {
    if (savedFlag !== "site-assessment") return;
    if (!Number.isFinite(projectId) || projectId <= 0) return;

    toast.success("Site assessment saved.");
    router.replace(`/projects/${projectId}?tab=overview`);
  }, [savedFlag, projectId, router]);

  async function reloadProject() {
    try {
      const response = await getProject(projectId);
      setProject(response.data);
    } catch {
      // Keep current project state if refresh fails.
    }
  }

  if (loading) {
    return <ProjectDetailLoading />;
  }

  if (error || !project) {
    return (
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader
          title="Project"
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

  const showSiteAssessmentLink =
    project.stage === "site_assessment" ||
    hasSiteAssessmentOperationalData(project.stage_data?.site_assessment);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={project.name}
        subtitle={`${project.reference} · ${formatProjectStage(project.stage)}`}
        actions={
          <div className="flex items-center gap-2">
            {project.stage === "final_design_approval" ? (
              <PermissionGate permission="projects.documents.upload">
                <Button variant="default" size="sm" type="button" onClick={handleUploadDesignClick}>
                  <Upload className="mr-1 h-4 w-4" />
                  Upload design
                </Button>
              </PermissionGate>
            ) : null}
            {showSiteAssessmentLink ? (
              <PermissionGate
                anyOf={[
                  "projects.site_assessment_notes",
                  "projects.advance_stage",
                  "projects.manage",
                  "projects.view",
                ]}
              >
                <Button variant="default" size="sm" asChild>
                  <Link href={`/projects/${project.id}/site-assessment`}>
                    <ClipboardList className="mr-1 h-4 w-4" />
                    {project.stage === "site_assessment"
                      ? "Site Assessment"
                      : "View Site Assessment"}
                  </Link>
                </Button>
              </PermissionGate>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects/pipeline">Pipeline</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                <ChevronLeft className="mr-1 h-4 w-4" />
                All projects
              </Link>
            </Button>
          </div>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectDetailActionBar project={project} onProjectUpdated={setProject} />
          <div ref={tabsRef}>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(parseProjectTab(value))}
            className="min-w-0"
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bom">BOM</TabsTrigger>
              <TabsTrigger value="designs">Designs</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6">
              <ProjectDetailOverview project={project} onProjectUpdated={() => void reloadProject()} />
            </TabsContent>
            <TabsContent value="bom" className="mt-6">
              <ProjectDetailBom project={project} onProjectUpdated={setProject} />
            </TabsContent>
            <TabsContent value="designs" className="mt-6">
              <ProjectDetailDesigns
                projectId={project.id}
                projectStage={project.stage}
                onProjectUpdated={setProject}
                uploadTrigger={designUploadTrigger}
              />
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
