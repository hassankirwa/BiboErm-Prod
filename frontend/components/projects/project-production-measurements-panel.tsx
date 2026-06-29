"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { ApiSiteVisit } from "@/lib/api/crm/types";
import { siteVisitDetailPath } from "@/lib/crm/site-visit-paths";
import { ApiError } from "@/lib/api/errors";
import {
  fetchProjectMeasurementVisits,
  hasProductionMeasurementData,
  type ProjectDetail,
} from "@/lib/api/projects";
import { hasSiteMeasurementFormData } from "@/lib/measurements/types";
import {
  projectSiteAssessmentPath,
  type ProjectViewMode,
} from "@/lib/projects/paths";
import { ClipboardList, ExternalLink } from "lucide-react";

type ProjectProductionMeasurementsPanelProps = {
  project: ProjectDetail;
  mode?: ProjectViewMode;
};

export function ProjectProductionMeasurementsPanel({
  project,
  mode = "projects",
}: ProjectProductionMeasurementsPanelProps) {
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const siteMeasurement = project.stage_data?.site_measurement;
  const hasSavedMeasurements = hasProductionMeasurementData(project);
  const hasFormData = hasSiteMeasurementFormData(siteMeasurement);
  const isAvailable = project.stage !== "awaiting_deposit";

  useEffect(() => {
    if (!isAvailable) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchProjectMeasurementVisits(project.id)
      .then((response) => {
        if (!cancelled) setVisits(response.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load measurement visits.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, isAvailable]);

  if (!isAvailable) return null;

  const siteAssessmentHref = projectSiteAssessmentPath(project.id, mode);
  const showPanel = loading || visits.length > 0 || hasSavedMeasurements || error;

  if (!showPanel) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Production measurements</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Field visits and approved measurement lines for production.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={siteAssessmentHref}>
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Manage
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Loading measurement visits…
          </div>
        ) : null}

        {error ? <p className="text-destructive">{error}</p> : null}

        {hasFormData && siteMeasurement ? (
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="font-medium">Approved snapshot</p>
            <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
              <p>
                <span className="text-foreground">{siteMeasurement.lines?.length ?? 0}</span>{" "}
                measurement lines
              </p>
              {siteMeasurement.measured_at ? (
                <p>
                  Measured{" "}
                  <span className="text-foreground">
                    {new Date(siteMeasurement.measured_at).toLocaleDateString()}
                  </span>
                </p>
              ) : null}
              {siteMeasurement.measured_by ? (
                <p>
                  By <span className="text-foreground">{siteMeasurement.measured_by}</span>
                </p>
              ) : null}
              {siteMeasurement.project_address ? (
                <p className="sm:col-span-2">{siteMeasurement.project_address}</p>
              ) : null}
            </div>
            {siteMeasurement.lines && siteMeasurement.lines.length > 0 ? (
              <div className="divide-y rounded-md border text-xs">
                {siteMeasurement.lines.slice(0, 5).map((line, index) => (
                  <div
                    key={`${line.ref ?? index}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="font-medium">
                      {line.ref || line.room_location || `Line ${index + 1}`}
                    </span>
                    <span className="text-muted-foreground">
                      {line.product_type ?? "—"}
                      {line.width_centre_mm && line.height_centre_mm
                        ? ` · ${line.width_centre_mm}×${line.height_centre_mm} mm`
                        : ""}
                    </span>
                  </div>
                ))}
                {siteMeasurement.lines.length > 5 ? (
                  <p className="px-3 py-2 text-muted-foreground">
                    +{siteMeasurement.lines.length - 5} more lines
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : hasSavedMeasurements ? (
          <p className="text-muted-foreground">
            Legacy site assessment data is recorded on this project.
          </p>
        ) : null}

        {!loading && visits.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Measurement visits</p>
            <div className="space-y-2">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{visit.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {visit.visit_number ?? `#${visit.id}`}
                      {visit.visit_date
                        ? ` · ${new Date(visit.visit_date).toLocaleDateString()}`
                        : ""}
                      {visit.assigned_field_officer?.name
                        ? ` · ${visit.assigned_field_officer.name}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SiteVisitStatusBadge status={visit.status ?? "scheduled"} />
                    <Button size="sm" variant="outline" asChild>
                      <Link href={siteVisitDetailPath(visit.id, "crm")}>
                        Open visit
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !loading && !hasSavedMeasurements && !error ? (
          <p className="text-muted-foreground">
            No production measurement visits yet. Schedule one from the manage page.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
