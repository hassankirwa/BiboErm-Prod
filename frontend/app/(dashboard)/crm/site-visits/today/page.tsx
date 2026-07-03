"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Loader2,
  MapPin,
  Play,
} from "lucide-react";
import {
  fetchTodaySiteVisits,
  startSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  canExecuteFieldVisit,
  canStartFieldVisit,
} from "@/lib/crm/site-visit-utils";
import { toast } from "sonner";
import type { SiteOpsMeasurementContext } from "@/lib/site-ops/paths";
import { SITE_OPS_CONTEXT_META } from "@/lib/site-ops/paths";

type SiteVisitsTodayPageViewProps = {
  measurementContext?: SiteOpsMeasurementContext;
  title?: string;
  subtitle?: string;
  myVisitsPath?: string;
  allVisitsPath?: string;
  visitDetailBasePath?: string;
};

export function SiteVisitsTodayPageView({
  measurementContext = "quotation",
  title,
  subtitle,
  myVisitsPath = "/crm/site-visits/my-visits",
  allVisitsPath = "/crm/site-visits",
  visitDetailBasePath = "/crm/site-visits",
}: SiteVisitsTodayPageViewProps) {
  const contextMeta = SITE_OPS_CONTEXT_META[measurementContext];
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTodaySiteVisits({
        measurement_context: measurementContext,
      });
      setVisits(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load today's visits.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [measurementContext]);

  useEffect(() => {
    loadVisits();
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

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={title ?? contextMeta.todayTitle}
        subtitle={
          subtitle ??
          new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={myVisitsPath}>My Visits</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={allVisitsPath}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                All Visits
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1 space-y-4 overflow-auto p-6">
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
            No visits assigned for today.
          </div>
        ) : (
          visits.map((visit) => {
            const status = visit.status ?? "scheduled";
            const busy = actionLoading === visit.id;
            const showStart = canStartFieldVisit(status);
            const showLogDetails = canExecuteFieldVisit(status);
            const isDone =
              status === "submitted_for_review" || status === "approved";

            return (
              <Card key={visit.id} className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`${visitDetailBasePath}/${visit.id}`}
                          className="hover:underline"
                        >
                          {visit.title}
                        </Link>
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {visit.visit_number ?? `#${visit.id}`}
                        {visit.visit_time ? ` · ${visit.visit_time}` : ""}
                      </p>
                    </div>
                    <SiteVisitStatusBadge status={status} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {visit.site_address && (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      {visit.site_address}
                    </p>
                  )}

                  {visit.notes_for_field_officer && (
                    <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      {visit.notes_for_field_officer}
                    </p>
                  )}

                  <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {showStart && (
                        <Button
                          size="default"
                          className="sm:flex-1"
                          disabled={busy}
                          onClick={() => void handleStartVisit(visit.id)}
                        >
                          {busy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Start visit
                        </Button>
                      )}

                      {showLogDetails && (
                        <Button
                          size="default"
                          className="sm:flex-1"
                          asChild
                        >
                          <Link href={`${visitDetailBasePath}/${visit.id}#log-details`}>
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Log details
                          </Link>
                        </Button>
                      )}

                      {status === "submitted_for_review" && (
                        <div className="flex flex-1 items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                          Submitted — awaiting sales review
                        </div>
                      )}

                      {status === "approved" && (
                        <div className="flex flex-1 items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                          Visit approved
                        </div>
                      )}
                    </div>
                  </PermissionGate>

                  {!showStart && !showLogDetails && !isDone && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${visitDetailBasePath}/${visit.id}`}>View visit</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SiteVisitsTodayPage() {
  return <SiteVisitsTodayPageView measurementContext="quotation" />;
}
