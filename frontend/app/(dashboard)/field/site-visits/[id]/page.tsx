"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { UnifiedSiteMeasurementForm } from "@/components/measurements/unified-site-measurement-form";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Navigation,
  Play,
} from "lucide-react";
import {
  approveSiteVisit,
  fetchSiteVisit,
  startSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { getProject, type ProjectDetail } from "@/lib/api/projects";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  canExecuteFieldVisit,
  canStartFieldVisit,
} from "@/lib/crm/site-visit-utils";
import { contextLabel, resolveMeasurementContext } from "@/lib/measurements/adapters";
import { toast } from "sonner";

function scrollToLogDetails() {
  document.getElementById("log-details")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function FieldSiteVisitDetailPage() {
  const params = useParams<{ id: string }>();
  const visitId = Number(params.id);
  const [visit, setVisit] = useState<ApiSiteVisit | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadVisit = useCallback(async () => {
    if (!Number.isFinite(visitId) || visitId <= 0) {
      setError("Invalid visit ID.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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
      setError(
        err instanceof ApiError ? err.message : "Failed to load site visit.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  useEffect(() => {
    if (!visit || isLoading) return;
    if (window.location.hash === "#log-details" && canExecuteFieldVisit(visit.status)) {
      scrollToLogDetails();
    }
  }, [visit, isLoading]);

  async function handleStartVisit() {
    if (!visit) return;
    setActionLoading(true);
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
      const updated = await startSiteVisit(visit.id, {
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
      });
      setVisit(updated);
      toast.success("Visit started. You can now log measurements.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start visit.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove() {
    if (!visit) return;
    setActionLoading(true);
    try {
      await ensureCsrfCookie();
      const updated = await approveSiteVisit(visit.id);
      setVisit(updated);
      toast.success("Visit approved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve visit.");
    } finally {
      setActionLoading(false);
    }
  }

  const status = visit?.status ?? "scheduled";
  const showLogDetails = canExecuteFieldVisit(status);
  const showStart = canStartFieldVisit(status);
  const context = visit ? resolveMeasurementContext(visit) : "quotation";

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={visit?.title ?? "Site Visit"}
        subtitle={visit?.visit_number ?? (visit ? `#${visit.id}` : "")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {showLogDetails && (
              <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                <Button size="sm" onClick={scrollToLogDetails}>
                  <ClipboardList className="mr-1 h-4 w-4" />
                  Log measurements
                </Button>
              </PermissionGate>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/field/open-visits">
                <Navigation className="mr-1 h-4 w-4" />
                Open visits
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/field">
                <MapPin className="mr-1 h-4 w-4" />
                Field home
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error || !visit ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
            {error ?? "Site visit not found."}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-4">
            <Card className="border-border">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{visit.title}</CardTitle>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {visit.visit_date
                          ? new Date(visit.visit_date).toLocaleDateString()
                          : "-"}
                        {visit.visit_time ? ` · ${visit.visit_time}` : ""}
                      </span>
                      {visit.assigned_field_officer?.name && (
                        <span>Officer: {visit.assigned_field_officer.name}</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contextLabel(context)}
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

                {visit.project_id && (
                  <p className="text-sm">Project: #{visit.project_id}</p>
                )}
                {visit.lead_id && <p className="text-sm">Lead: #{visit.lead_id}</p>}
                {visit.deal_id && <p className="text-sm">Deal: #{visit.deal_id}</p>}

                {visit.notes_for_field_officer && (
                  <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                    {visit.notes_for_field_officer}
                  </p>
                )}

                {visit.photos && visit.photos.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded photos</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {visit.photos.map((photo) => {
                        const src = photo.url ?? photo.firebase_url ?? undefined;
                        if (!src) return null;
                        return (
                          <a
                            key={photo.id}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-md border border-border bg-muted/30"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`Site visit photo ${photo.id}`}
                              className="aspect-square w-full object-cover"
                            />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {showStart && (
                    <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => void handleStartVisit()}
                      >
                        {actionLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Start visit
                      </Button>
                    </PermissionGate>
                  )}

                  {showLogDetails && (
                    <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                      <Button size="sm" variant="default" onClick={scrollToLogDetails}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Log measurements
                      </Button>
                    </PermissionGate>
                  )}

                  {status === "submitted_for_review" && (
                    <PermissionGate permission="site_visits.approve">
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => void handleApprove()}
                      >
                        {actionLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </CardContent>
            </Card>

            {showLogDetails && (
              <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                <UnifiedSiteMeasurementForm
                  visit={visit}
                  project={project}
                  onVisitUpdated={setVisit}
                />
              </PermissionGate>
            )}

            {status === "submitted_for_review" && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                Field visit complete — awaiting approval.
              </div>
            )}

            {status === "approved" && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                Visit approved.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
