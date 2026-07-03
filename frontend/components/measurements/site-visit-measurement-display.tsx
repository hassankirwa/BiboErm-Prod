"use client";

import { useCallback, useEffect, useState } from "react";
import { UnifiedSiteMeasurementForm } from "@/components/measurements/unified-site-measurement-form";
import { Spinner } from "@/components/ui/spinner";
import { fetchSiteVisit, type ApiSiteVisit } from "@/lib/api/crm/site-visits";
import { getProject, type ProjectDetail } from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";

type SiteVisitMeasurementDisplayProps = {
  visitId: number | null | undefined;
  sectionId?: string;
  emptyMessage?: string;
  className?: string;
};

export function SiteVisitMeasurementDisplay({
  visitId,
  sectionId = "site-measurements",
  emptyMessage = "No site visit linked — measurements are not available yet.",
  className,
}: SiteVisitMeasurementDisplayProps) {
  const [visit, setVisit] = useState<ApiSiteVisit | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visitId || visitId <= 0) {
      setVisit(null);
      setProject(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchSiteVisit(visitId);
      setVisit(data);

      if (data.project_id) {
        try {
          const projectResponse = await getProject(data.project_id);
          setProject(projectResponse.data);
        } catch {
          setProject(null);
        }
      } else {
        setProject(null);
      }
    } catch (err) {
      setVisit(null);
      setProject(null);
      setError(
        err instanceof ApiError ? err.message : "Failed to load measurements.",
      );
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!visitId || visitId <= 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <p className="text-sm text-destructive">{error ?? emptyMessage}</p>
    );
  }

  return (
    <div className={className}>
      <UnifiedSiteMeasurementForm
        visit={visit}
        project={project}
        onVisitUpdated={setVisit}
        sectionId={sectionId}
      />
    </div>
  );
}
