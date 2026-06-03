"use client";

import { useEffect, useState } from "react";
import {
  type ProjectSummary,
  type ProjectsDashboard,
  getProjectsDashboard,
  listProjects,
} from "@/lib/api/projects";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { ProjectsStats } from "@/components/projects/projects-stats";

export function ProjectsOverview() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [dashboard, setDashboard] = useState<ProjectsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [projectsResponse, dashboardResponse] = await Promise.all([
          listProjects({ per_page: 24 }),
          getProjectsDashboard(),
        ]);

        if (cancelled) {
          return;
        }

        setProjects(projectsResponse.data ?? []);
        setDashboard(dashboardResponse.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load projects.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <ProjectsStats dashboard={dashboard} loading={loading} />
      <ProjectsFilters />
      {error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <ProjectsGrid projects={projects} loading={loading} />
    </>
  );
}
