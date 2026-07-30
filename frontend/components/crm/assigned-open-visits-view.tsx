"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { FieldOpenVisitCard } from "@/components/crm/field-open-visit-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeft } from "lucide-react";
import {
  fetchOpenAssignedSiteVisits,
  startSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  siteVisitListPath,
  siteVisitTodayPath,
  type SiteVisitWorkspace,
} from "@/lib/crm/site-visit-paths";
import type { SiteOpsMeasurementContext } from "@/lib/site-ops/paths";
import { SITE_OPS_CONTEXT_META } from "@/lib/site-ops/paths";
import { toast } from "sonner";

type AssignedOpenVisitsViewProps = {
  workspace: SiteVisitWorkspace;
  /** When omitted, returns all open assigned visits (quotation + production). */
  measurementContext?: SiteOpsMeasurementContext;
  title?: string;
  subtitle?: string;
  backPath?: string;
  backLabel?: string;
  todayPath?: string;
  /** Hide page chrome when nested inside another workspace (e.g. Activities tabs). */
  embedded?: boolean;
};

export function AssignedOpenVisitsView({
  workspace,
  measurementContext,
  title,
  subtitle,
  backPath,
  backLabel,
  todayPath,
  embedded = false,
}: AssignedOpenVisitsViewProps) {
  const contextMeta = measurementContext
    ? SITE_OPS_CONTEXT_META[measurementContext]
    : null;
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const resolvedTitle = title ?? contextMeta?.myVisitsTitle ?? "My site visits";
  const resolvedSubtitle =
    subtitle ??
    contextMeta?.myVisitsSubtitle ??
    "Open measurement visits assigned to you (quotation and production).";

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchOpenAssignedSiteVisits(
        measurementContext
          ? { measurement_context: measurementContext }
          : undefined,
      );
      setVisits(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load open visits.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [measurementContext]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  async function handleStartVisit(visitId: number) {
    setActionLoading(visitId);
    try {
      await ensureCsrfCookie();
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { timeout: 8000 },
        );
      });

      const updated = await startSiteVisit(visitId, {
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
      });
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
      toast.success("Visit started. You can now log measurements.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start visit.");
    } finally {
      setActionLoading(null);
    }
  }

  const resolvedTodayPath = todayPath ?? siteVisitTodayPath(workspace);
  const resolvedBackPath =
    backPath ??
    (workspace === "field" ? "/field" : siteVisitListPath(workspace));
  const resolvedBackLabel =
    backLabel ?? (workspace === "field" ? "Field Home" : "All Visits");

  const list = (
    <div className={embedded ? "space-y-4" : "flex-1 space-y-4 overflow-auto p-6"}>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
          {error}
        </div>
      ) : visits.length === 0 ? (
        <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No open visits assigned to you right now.
        </div>
      ) : (
        visits.map((visit) => (
          <FieldOpenVisitCard
            key={visit.id}
            visit={visit}
            workspace={workspace}
            actionLoading={actionLoading}
            onStartVisit={(id) => void handleStartVisit(id)}
          />
        ))
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{resolvedTitle}</h2>
            <p className="text-sm text-muted-foreground">{resolvedSubtitle}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={resolvedTodayPath}>Today&apos;s Visits</Link>
          </Button>
        </div>
        {list}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={resolvedTitle}
        subtitle={resolvedSubtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={resolvedBackPath}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {resolvedBackLabel}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={resolvedTodayPath}>Today&apos;s Visits</Link>
            </Button>
          </div>
        }
      />

      {list}
    </div>
  );
}
