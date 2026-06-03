"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  getProjectsPipeline,
  type PipelineProject,
  type PipelineStageColumn,
} from "@/lib/api/projects";
import {
  AlertCircle,
  Calendar,
  Package,
  Search,
  User,
} from "lucide-react";

const stageColors: Record<string, string> = {
  awaiting_deposit: "bg-muted",
  deposit_received: "bg-info/20",
  site_assessment: "bg-info/20",
  final_design_approval: "bg-info/20",
  bom_finalized: "bg-info/20",
  material_check: "bg-warning/20",
  materials_reserved: "bg-warning/20",
  awaiting_procurement: "bg-warning/20",
  materials_ready: "bg-success/20",
  cutting_stage: "bg-primary/20",
  fabrication_stage: "bg-primary/20",
  glass_assembly: "bg-primary/20",
  qc_pre_installation: "bg-chart-4/20",
  in_transit: "bg-chart-5/20",
  installation: "bg-chart-5/20",
  site_qc: "bg-chart-4/20",
  snagging: "bg-warning/20",
};

const materialColors: Record<string, string> = {
  reserved: "bg-warning/10 text-warning",
  shortage: "bg-destructive/10 text-destructive",
  procurement: "bg-warning/10 text-warning",
  ready: "bg-success/10 text-success",
  checking: "bg-info/10 text-info",
};

const bomColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  finalized: "bg-success/10 text-success",
  superseded: "bg-muted text-muted-foreground",
};

type PhaseFilter = "all" | "pre_production" | "materials" | "production" | "delivery";

type ProjectsPipelineProps = {
  /** When true, cards link to /projects/[id] */
  linkToDetail?: boolean;
};

const phaseStages: Record<Exclude<PhaseFilter, "all">, string[]> = {
  pre_production: [
    "awaiting_deposit",
    "deposit_received",
    "site_assessment",
    "final_design_approval",
    "bom_finalized",
  ],
  materials: ["material_check", "materials_reserved", "awaiting_procurement", "materials_ready"],
  production: [
    "cutting_stage",
    "fabrication_stage",
    "glass_assembly",
    "qc_pre_installation",
  ],
  delivery: ["in_transit", "installation", "site_qc", "snagging"],
};

function PipelineCard({
  project,
  linkToDetail,
}: {
  project: PipelineProject;
  linkToDetail?: boolean;
}) {
  const projectedEnd = project.projected_end ? new Date(project.projected_end) : null;
  const isDelayed =
    projectedEnd !== null &&
    projectedEnd < new Date() &&
    project.stage !== "project_complete";

  const clientLabel =
    project.account?.name ??
    project.deal?.name ??
    project.deal?.reference ??
    "No client linked";

  const card = (
    <Card className="border-border bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground truncate">{project.reference}</p>
          </div>
          {isDelayed ? (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground truncate">{clientLabel}</p>

        <div className="flex flex-wrap gap-1">
          {project.material.label && project.material.status !== "none" ? (
            <Badge
              variant="secondary"
              className={`text-[10px] h-5 ${materialColors[project.material.status] ?? ""}`}
            >
              <Package className="mr-1 h-3 w-3" />
              {project.material.label}
            </Badge>
          ) : null}
          {project.bom ? (
            <Badge
              variant="secondary"
              className={`text-[10px] h-5 ${bomColors[project.bom.status] ?? "bg-muted"}`}
            >
              BOM v{project.bom.version} · {project.bom.status}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.completion_percent}%</span>
          </div>
          <Progress value={project.completion_percent} className="h-1" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
          {project.project_manager ? (
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3 flex-shrink-0" />
              {project.project_manager.name}
            </span>
          ) : (
            <span className="italic">Unassigned PM</span>
          )}
          {project.projected_end ? (
            <span className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-3 w-3" />
              {new Date(project.projected_end).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (linkToDetail) {
    return (
      <Link href={`/projects/${project.id}`} className="block">
        {card}
      </Link>
    );
  }

  return card;
}

export function ProjectsPipeline({ linkToDetail = false }: ProjectsPipelineProps) {
  const [columns, setColumns] = useState<PipelineStageColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<PhaseFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await getProjectsPipeline();
        if (!cancelled) {
          setColumns(response.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pipeline.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void load();
      }
    }

    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const filteredColumns = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const allowedStages =
      phase === "all" ? null : new Set(phaseStages[phase]);

    return columns
      .filter((column) => !allowedStages || allowedStages.has(column.stage))
      .map((column) => ({
        ...column,
        projects: column.projects.filter((project) => {
          if (!needle) return true;

          const haystack = [
            project.name,
            project.reference,
            project.account?.name,
            project.deal?.name,
            project.deal?.reference,
            project.project_manager?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(needle);
        }),
      }))
      .map((column) => ({
        ...column,
        count: column.projects.length,
      }));
  }, [columns, search, phase]);

  const totalInPipeline = useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.projects.length, 0),
    [filteredColumns],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (totalInPipeline === 0 && columns.every((c) => c.projects.length === 0)) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No projects in the pipeline yet. Create a project from a CRM account or won deal.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects, clients, PM..."
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={phase} onValueChange={(v) => setPhase(v as PhaseFilter)}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All phases</SelectItem>
            <SelectItem value="pre_production">Pre-production</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="delivery">Delivery & QC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {totalInPipeline} project{totalInPipeline === 1 ? "" : "s"} in pipeline
        {search || phase !== "all" ? " (filtered)" : ""}
      </p>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {filteredColumns.map((column) => (
          <div key={column.stage} className="flex-shrink-0 w-72">
            <Card className={`border-border ${stageColors[column.stage] ?? "bg-muted"}`}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {column.label}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {column.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {column.projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No projects</p>
                ) : (
                  column.projects.map((project) => (
                    <PipelineCard
                      key={project.id}
                      project={project}
                      linkToDetail={linkToDetail}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
