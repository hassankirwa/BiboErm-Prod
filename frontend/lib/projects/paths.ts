export type ProjectViewMode = "projects" | "crm";

export function projectDetailPath(
  id: number,
  mode: ProjectViewMode,
  query?: Record<string, string | null | undefined>,
): string {
  const base = mode === "crm" ? `/crm/projects/${id}` : `/projects/${id}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function projectListPath(mode: ProjectViewMode): string {
  return mode === "crm" ? "/crm/projects" : "/projects";
}

export function projectPipelinePath(mode: ProjectViewMode): string {
  return mode === "crm" ? "/crm/projects" : "/projects/pipeline";
}

export function projectSiteAssessmentPath(id: number, mode: ProjectViewMode): string {
  return mode === "crm"
    ? `/crm/projects/${id}/site-assessment`
    : `/projects/${id}/site-assessment`;
}

export function projectTabPath(
  id: number,
  tab: "overview" | "bom" | "designs" | "production" | "qc",
  mode: ProjectViewMode,
): string {
  if (tab === "overview") {
    return projectDetailPath(id, mode);
  }
  return projectDetailPath(id, mode, { tab });
}
