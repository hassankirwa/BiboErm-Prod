"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ProjectDetailActionBar } from "@/components/projects/project-detail-action-bar";
import { ProjectDetailBom } from "@/components/projects/project-detail-bom";
import { ProjectDetailDesigns } from "@/components/projects/project-detail-designs";
import { ProjectDetailFabrication } from "@/components/projects/project-detail-fabrication";
import { ProjectDetailOverview } from "@/components/projects/project-detail-overview";
import { ProjectDetailProduction } from "@/components/projects/project-detail-production";
import { ProjectDetailDesignChanges } from "@/components/projects/project-detail-design-changes";
import { ProjectDetailQc } from "@/components/projects/project-detail-qc";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatProjectStage,
  fetchProjectMeasurementVisits,
  getProject,
  hasAssignedProductionMeasurementVisit,
  hasProductionMeasurementData,
  projectStageAllowsProductionMeasurements,
  type ProjectDetail,
} from "@/lib/api/projects";
import type { ApiSiteVisit } from "@/lib/api/crm/types";
import { ApiError } from "@/lib/api/errors";
import {
  projectDetailPath,
  projectListPath,
  projectPipelinePath,
  projectSiteAssessmentPath,
  type ProjectViewMode,
} from "@/lib/projects/paths";
import { usePermissions } from "@/hooks/use-permissions";
import { ChevronLeft, ClipboardList, Upload } from "lucide-react";
import { toast } from "sonner";

type ProjectTab =
  | "overview"
  | "bom"
  | "designs"
  | "production"
  | "fabrication"
  | "qc"
  | "changes";

function parseProjectTab(tab: string | null): ProjectTab {
  if (
    tab === "bom" ||
    tab === "designs" ||
    tab === "production" ||
    tab === "fabrication" ||
    tab === "qc" ||
    tab === "changes"
  ) {
    return tab;
  }
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

type ProjectDetailViewProps = {
  projectId: number;
  mode: ProjectViewMode;
};

export function ProjectDetailView({ projectId, mode }: ProjectDetailViewProps) {
  const isCrmMode = mode === "crm";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAny } = usePermissions();
  const activeTab = parseProjectTab(searchParams.get("tab"));
  const savedFlag = searchParams.get("saved");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [measurementVisits, setMeasurementVisits] = useState<ApiSiteVisit[]>([]);
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
    const href = query
      ? projectDetailPath(projectId, mode, Object.fromEntries(params))
      : projectDetailPath(projectId, mode);
    router.replace(href, { scroll: false });
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
      .then(async (response) => {
        if (cancelled) return;
        setProject(response.data);

        const stageAllows =
          projectStageAllowsProductionMeasurements(response.data.stage) ||
          hasProductionMeasurementData(response.data);
        if (!stageAllows) {
          setMeasurementVisits([]);
          return;
        }

        try {
          const visitsResponse = await fetchProjectMeasurementVisits(projectId);
          if (!cancelled) {
            setMeasurementVisits(visitsResponse.data ?? []);
          }
        } catch {
          if (!cancelled) setMeasurementVisits([]);
        }
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
    router.replace(projectDetailPath(projectId, mode, { tab: "overview" }));
  }, [savedFlag, mode, projectId, router]);

  async function reloadProject() {
    try {
      const response = await getProject(projectId);
      setProject(response.data);
      if (
        projectStageAllowsProductionMeasurements(response.data.stage) ||
        hasProductionMeasurementData(response.data)
      ) {
        try {
          const visitsResponse = await fetchProjectMeasurementVisits(projectId);
          setMeasurementVisits(visitsResponse.data ?? []);
        } catch {
          setMeasurementVisits([]);
        }
      } else {
        setMeasurementVisits([]);
      }
    } catch {
      // Keep current project state if refresh fails.
    }
  }

  const backHref =
    isCrmMode && project?.deal
      ? `/crm/deals/${project.deal.id}`
      : projectListPath(mode);

  const backLabel =
    isCrmMode && project?.deal ? "Back to Deal" : isCrmMode ? "CRM Projects" : "All projects";

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
              <Link href={projectListPath(mode)}>
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

  const stageOk =
    projectStageAllowsProductionMeasurements(project.stage) ||
    hasProductionMeasurementData(project);
  const assigned = hasAssignedProductionMeasurementVisit(measurementVisits);
  const canSchedule = canAny(
    "site_visits.schedule",
    "projects.manage",
    "projects.advance_stage",
  );
  const showProductionMeasurementsLink = stageOk && (assigned || canSchedule);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={project.name}
        subtitle={`${project.reference} · ${formatProjectStage(project.stage)}`}
        actions={
          <div className="flex items-center gap-2">
            {!isCrmMode && project.stage === "final_design_approval" ? (
              <PermissionGate permission="projects.documents.upload">
                <Button variant="default" size="sm" type="button" onClick={handleUploadDesignClick}>
                  <Upload className="mr-1 h-4 w-4" />
                  Import fabrication list
                </Button>
              </PermissionGate>
            ) : null}
            {showProductionMeasurementsLink ? (
              <PermissionGate
                anyOf={[
                  "projects.site_assessment_notes",
                  "projects.advance_stage",
                  "projects.manage",
                  "projects.view",
                  "site_visits.schedule",
                  "site_visits.execute",
                ]}
              >
                <Button variant="default" size="sm" asChild>
                  <Link href={projectSiteAssessmentPath(project.id, mode)}>
                    <ClipboardList className="mr-1 h-4 w-4" />
                    Production measurements
                  </Link>
                </Button>
              </PermissionGate>
            ) : null}
            {!isCrmMode ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={projectPipelinePath(mode)}>Pipeline</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href={backHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
          </div>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectDetailActionBar
            project={project}
            mode={mode}
            onProjectUpdated={setProject}
          />
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
                <PermissionGate permission="production.view">
                  <TabsTrigger value="production">Production</TabsTrigger>
                </PermissionGate>
                <PermissionGate permission="production.view">
                  <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
                </PermissionGate>
                <PermissionGate permission="qc.view">
                  <TabsTrigger value="qc">Quality</TabsTrigger>
                </PermissionGate>
                <TabsTrigger value="changes">Design changes</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-6">
                <ProjectDetailOverview
                  project={project}
                  mode={mode}
                  onProjectUpdated={() => void reloadProject()}
                />
              </TabsContent>
              <TabsContent value="bom" className="mt-6">
                <ProjectDetailBom
                  project={project}
                  readOnly={isCrmMode}
                  onProjectUpdated={setProject}
                />
              </TabsContent>
              <TabsContent value="designs" className="mt-6">
                <ProjectDetailDesigns
                  projectId={project.id}
                  projectStage={project.stage}
                  readOnly={isCrmMode}
                  onProjectUpdated={setProject}
                  uploadTrigger={isCrmMode ? 0 : designUploadTrigger}
                />
              </TabsContent>
              <PermissionGate permission="production.view">
                <TabsContent value="production" className="mt-6">
                  <ProjectDetailProduction
                    projectId={project.id}
                    projectStage={project.stage}
                  />
                </TabsContent>
              </PermissionGate>
              <PermissionGate permission="production.view">
                <TabsContent value="fabrication" className="mt-6">
                  <ProjectDetailFabrication project={project} />
                </TabsContent>
              </PermissionGate>
              <PermissionGate permission="qc.view">
                <TabsContent value="qc" className="mt-6">
                  <ProjectDetailQc project={project} />
                </TabsContent>
              </PermissionGate>
              <TabsContent value="changes" className="mt-6">
                <ProjectDetailDesignChanges projectId={project.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailContent({
  params,
  mode = "projects",
}: {
  params: Promise<{ id: string }>;
  mode?: ProjectViewMode;
}) {
  const { id } = use(params);
  return <ProjectDetailView projectId={Number(id)} mode={mode} />;
}
