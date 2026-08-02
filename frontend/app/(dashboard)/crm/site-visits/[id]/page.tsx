"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { UnifiedSiteMeasurementForm } from "@/components/measurements/unified-site-measurement-form";
import { SiteVisitPhotosGrid } from "@/components/measurements/site-visit-photos-grid";
import { SiteVisitDealContext } from "@/components/crm/site-visit-deal-context";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import { SiteVisitLocationPanel } from "@/components/crm/site-visit-location-panel";
import { resolveSiteVisitLocation } from "@/lib/crm/site-visit-location";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Loader2,
  Play,
} from "lucide-react";
import {
  approveSiteVisit,
  fetchSiteVisit,
  requestSiteVisitChanges,
  startSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { getProject, type ProjectDetail } from "@/lib/api/projects";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  canApproveSiteVisit,
  canExecuteFieldVisit,
  canStartFieldVisit,
} from "@/lib/crm/site-visit-utils";
import { contextLabel, resolveMeasurementContext } from "@/lib/measurements/adapters";
import { hasSiteMeasurementFormData } from "@/lib/measurements/types";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

function scrollToLogDetails() {
  document.getElementById("log-details")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function SiteVisitDetailPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { user, roles } = useAuth();
  const visitId = Number(params.id);
  const [visit, setVisit] = useState<ApiSiteVisit | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const isCrmRoute = pathname.startsWith("/crm/");
  const isProjectRoute = pathname.startsWith("/projects/");
  const myVisitsPath = isCrmRoute
    ? "/crm/site-visits/my-visits"
    : "/site-visits/my-visits";
  const allVisitsPath =
    isProjectRoute && project
      ? `/projects/${project.id}/site-assessment`
      : isCrmRoute
        ? "/crm/site-visits"
        : "/site-visits";
  const hasScrolledToLogDetails = useRef(false);

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
    if (!visit || isLoading || hasScrolledToLogDetails.current) return;
    if (window.location.hash === "#log-details" && canExecuteFieldVisit(visit.status)) {
      hasScrolledToLogDetails.current = true;
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

  async function handleRequestChanges(
    action: "clarification_needed" | "revisit_required",
  ) {
    if (!visit || !reviewNotes.trim()) return;
    setActionLoading(true);
    try {
      await ensureCsrfCookie();
      const updated = await requestSiteVisitChanges(visit.id, {
        action,
        notes: reviewNotes.trim(),
      });
      setVisit(updated);
      setReviewOpen(false);
      setReviewNotes("");
      toast.success(
        action === "revisit_required"
          ? "Revisit requested."
          : "Corrections requested.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to request changes.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const status = visit?.status ?? "scheduled";
  const showLogDetails = canExecuteFieldVisit(status);
  const showStart = canStartFieldVisit(status);
  const awaitingApproval = status === "submitted_for_review";
  const showMeasurementForm =
    showLogDetails ||
    awaitingApproval ||
    status === "approved" ||
    status === "measurements_captured" ||
    hasSiteMeasurementFormData(visit?.measurement_form_data ?? null);
  const context = visit ? resolveMeasurementContext(visit) : "quotation";
  const canApprove = canApproveSiteVisit(visit, user?.id, roles);
  const visitLocation = visit ? resolveSiteVisitLocation(visit) : null;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={visit?.title ?? "Site Visit"}
        subtitle={visit?.visit_number ?? (visit ? `#${visit.id}` : "")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {awaitingApproval && canApprove && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setReviewOpen(true)}
                >
                  Request changes
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void handleApprove()}
                >
                  {actionLoading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  )}
                  Approve visit
                </Button>
              </>
            )}
            {showLogDetails && (
              <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                <Button size="sm" variant="outline" onClick={scrollToLogDetails}>
                  <ClipboardList className="mr-1 h-4 w-4" />
                  Log measurements
                </Button>
              </PermissionGate>
            )}
            {showMeasurementForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  document.getElementById("measurement-sketch")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                View sketch
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={myVisitsPath}>My visits</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={allVisitsPath}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {isProjectRoute ? "Site assessment" : "All visits"}
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
          <div className="w-full space-y-4">
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
                {visit.lead_id && (
                  <p className="text-sm">
                    Lead:{" "}
                    <Link
                      href={`/crm/leads/${visit.lead_id}`}
                      className="text-primary hover:underline"
                    >
                      #{visit.lead_id}
                    </Link>
                  </p>
                )}

                {visit.deal_id && (
                  <p className="text-sm">
                    Deal:{" "}
                    <Link
                      href={`/crm/deals/${visit.deal_id}`}
                      className="text-primary hover:underline"
                    >
                      #{visit.deal_id}
                    </Link>
                  </p>
                )}

                {visit.notes_for_field_officer && (
                  <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                    {visit.notes_for_field_officer}
                  </p>
                )}

                {visit.photos && visit.photos.length > 0 ? (
                  <SiteVisitPhotosGrid visit={visit} />
                ) : null}

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

                  {status === "submitted_for_review" && canApprove && (
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
                  )}
                </div>

                <SiteVisitLocationPanel
                  siteAddress={visitLocation?.siteAddress}
                  latitude={visitLocation?.latitude}
                  longitude={visitLocation?.longitude}
                />
              </CardContent>
            </Card>

            {visit.deal_id && <SiteVisitDealContext visit={visit} />}

            {visit.review_notes ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">
                  {status === "revisit_required"
                    ? "Revisit required"
                    : status === "clarification_needed"
                      ? "Corrections requested"
                      : "Review notes"}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{visit.review_notes}</p>
                <p className="mt-1 text-xs">
                  {visit.reviewer?.name
                    ? `Reviewed by ${visit.reviewer.name}`
                    : "Reviewer feedback"}
                  {visit.reviewed_at
                    ? ` · ${new Date(visit.reviewed_at).toLocaleString()}`
                    : ""}
                </p>
              </div>
            ) : null}

            {showMeasurementForm &&
              (showLogDetails ? (
                <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                  <UnifiedSiteMeasurementForm
                    visit={visit}
                    project={project}
                    onVisitUpdated={setVisit}
                  />
                </PermissionGate>
              ) : (
                <UnifiedSiteMeasurementForm
                  visit={visit}
                  project={project}
                  onVisitUpdated={setVisit}
                />
              ))}

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

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request measurement changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="site-visit-review-notes">
              Correction or revisit notes
            </Label>
            <Textarea
              id="site-visit-review-notes"
              rows={5}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Explain exactly what must be corrected or measured again."
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRequestChanges("clarification_needed")}
              disabled={actionLoading || !reviewNotes.trim()}
            >
              Request correction
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRequestChanges("revisit_required")}
              disabled={actionLoading || !reviewNotes.trim()}
            >
              Require revisit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
