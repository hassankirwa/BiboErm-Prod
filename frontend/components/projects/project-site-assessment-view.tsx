"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { SiteVisitAssigneeSelect } from "@/components/crm/site-visit-assignee-select";
import { SiteVisitReviewPanel } from "@/components/crm/site-visit-review-panel";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import { UnifiedSiteMeasurementForm } from "@/components/measurements/unified-site-measurement-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ApiSiteVisit } from "@/lib/api/crm/types";
import { reassignSiteVisit } from "@/lib/api/crm/site-visits";
import {
  siteVisitDetailPath,
  siteVisitOpenVisitsPath,
  siteVisitWorkspaceForRoles,
  projectSiteVisitDetailPath,
} from "@/lib/crm/site-visit-paths";
import {
  canExecuteFieldVisit,
  canStartFieldVisit,
} from "@/lib/crm/site-visit-utils";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  fetchProjectMeasurementVisits,
  formatProjectStage,
  getProject,
  hasProductionMeasurementData,
  scheduleProjectMeasurementVisit,
  type ProjectDetail,
} from "@/lib/api/projects";
import {
  projectDetailPath,
  projectListPath,
  type ProjectViewMode,
} from "@/lib/projects/paths";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const SCHEDULE_PERMISSIONS = [
  "projects.update",
  "projects.manage",
  "site_visits.schedule",
  "projects.site_assessment_notes",
  "projects.advance_stage",
  "projects.advance_stage_production",
] as const;

const ACTIVE_VISIT_STATUSES = new Set([
  "scheduled",
  "assigned",
  "in_progress",
  "measurements_captured",
  "submitted_for_review",
  "clarification_needed",
  "revisit_required",
]);

type ProjectSiteAssessmentViewProps = {
  projectId: number;
  mode?: ProjectViewMode;
};

export function ProjectSiteAssessmentView({
  projectId,
  mode = "projects",
}: ProjectSiteAssessmentViewProps) {
  const { user, roles } = useAuth();
  const { permissions } = usePermissions();
  const visitWorkspace = siteVisitWorkspaceForRoles(roles);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignAssigneeId, setReassignAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: "",
    assigned_field_officer_id: "",
    site_address: "",
    notes_for_field_officer: "",
  });

  const projectBackHref = project ? projectDetailPath(project.id, mode) : projectListPath(mode);

  async function loadData() {
    if (!Number.isFinite(projectId) || projectId <= 0) {
      setError("Invalid project id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [projectResponse, visitsResponse] = await Promise.all([
        getProject(projectId),
        fetchProjectMeasurementVisits(projectId),
      ]);
      setProject(projectResponse.data);
      setVisits(visitsResponse.data ?? []);
      const resolvedAddress =
        projectResponse.data.resolved_site_address ??
        projectResponse.data.site_address ??
        "";
      setForm((current) => ({
        ...current,
        title: current.title || `Production measurement — ${projectResponse.data.name}`,
        site_address: current.site_address || resolvedAddress,
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [projectId]);

  async function handleSchedule() {
    if (!form.assigned_field_officer_id) {
      toast.error("Select who will take the measurements.");
      return;
    }

    if (!form.site_address.trim()) {
      toast.error("Enter the site location for this visit.");
      return;
    }

    setScheduling(true);
    try {
      await ensureCsrfCookie();
      const { data: visit } = await scheduleProjectMeasurementVisit(projectId, {
        title: form.title,
        assigned_field_officer_id: Number(form.assigned_field_officer_id),
        visit_date: form.visit_date,
        visit_time: form.visit_time || undefined,
        site_address: form.site_address.trim(),
        notes_for_field_officer: form.notes_for_field_officer || undefined,
      });
      toast.success("Production measurement visit scheduled.");
      setForm((current) => ({
        ...current,
        assigned_field_officer_id: "",
        notes_for_field_officer: "",
      }));
      await loadData();
      if (visit?.id) {
        toast.info("Open the visit in Site Visits to start capturing measurements.", {
          action: {
            label: "Open visit",
            onClick: () => {
              window.location.href = siteVisitDetailPath(visit.id, "crm");
            },
          },
        });
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to schedule measurement visit.",
      );
    } finally {
      setScheduling(false);
    }
  }

  async function handleReassign(visit: ApiSiteVisit) {
    if (!reassignAssigneeId) {
      toast.error("Select the new assignee.");
      return;
    }

    setReassigning(true);
    try {
      await ensureCsrfCookie();
      await reassignSiteVisit(visit.id, Number(reassignAssigneeId));
      toast.success(
        visit.status === "revisit_required"
          ? "Visit reassigned for redo."
          : "Measurement visit reassigned.",
      );
      setReassignAssigneeId("");
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to reassign visit.",
      );
    } finally {
      setReassigning(false);
    }
  }

  const activeVisit = useMemo(
    () => visits.find((visit) => ACTIVE_VISIT_STATUSES.has(visit.status ?? "")),
    [visits],
  );
  const executableVisit = useMemo(
    () => visits.find((visit) => canExecuteFieldVisit(visit.status ?? null)),
    [visits],
  );
  const approvedVisit = useMemo(
    () => visits.find((visit) => visit.status === "approved"),
    [visits],
  );
  const reviewVisit = useMemo(
    () => visits.find((visit) => visit.status === "submitted_for_review"),
    [visits],
  );
  const assignmentVisit = activeVisit ?? approvedVisit;
  const canReassignVisit =
    assignmentVisit != null &&
    !["submitted_for_review", "approved"].includes(
      assignmentVisit.status ?? "",
    );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader
          title="Production measurements"
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

  const isTooEarly = project.stage === "awaiting_deposit";
  const hasSavedData = hasProductionMeasurementData(project);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Production measurements"
        subtitle={`${project.name} · ${formatProjectStage(project.stage)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/site-visits">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                All site visits
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={siteVisitOpenVisitsPath(visitWorkspace)}>My visits</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={projectBackHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to project
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-6">
        <div className="w-full space-y-4">
          {isTooEarly ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Not available yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Production measurements open once deposit is received on this project.
              </CardContent>
            </Card>
          ) : (
            <>
              {!assignmentVisit ? (
                <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assign measurement visit</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Schedule a production site visit and assign someone to capture final
                    measurements using the same CRM site visit workflow.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Input
                        value={form.title}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Visit date</Label>
                      <Input
                        type="date"
                        value={form.visit_date}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            visit_date: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Visit time</Label>
                      <Input
                        type="time"
                        value={form.visit_time}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            visit_time: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Assigned to</Label>
                      <SiteVisitAssigneeSelect
                        value={form.assigned_field_officer_id}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            assigned_field_officer_id: value,
                          }))
                        }
                        currentUserId={user?.id}
                        currentUserName={user?.name}
                        placeholder="Select assignee"
                        allActiveUsers
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Site location</Label>
                    <Input
                      value={form.site_address}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          site_address: event.target.value,
                        }))
                      }
                      placeholder="Building, estate, road, city…"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown on CRM Site Visits for the assignee. Prefilled from the project,
                      deal, account, or earlier quotation visit when available.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes for measurer</Label>
                    <Textarea
                      rows={3}
                      value={form.notes_for_field_officer}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          notes_for_field_officer: event.target.value,
                        }))
                      }
                      placeholder="Access instructions, contact on site, scope reminders…"
                    />
                  </div>
                  <PermissionGate anyOf={[...SCHEDULE_PERMISSIONS]}>
                    <Button onClick={() => void handleSchedule()} disabled={scheduling}>
                      {scheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Assign & schedule visit
                    </Button>
                  </PermissionGate>
                </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Measurement visit assigned
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      The assignment form is hidden while an active visit exists.
                      {canReassignVisit
                        ? " Reassign this visit if another person should complete it"
                        : " The visit is awaiting review or has already been approved"}
                      {assignmentVisit.status === "revisit_required"
                        ? " or redo the rejected measurements."
                        : "."}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <SiteVisitStatusBadge status={assignmentVisit.status} />
                      <span className="text-sm">
                        Assigned to{" "}
                        <strong>
                          {assignmentVisit.assigned_field_officer?.name ?? "Unknown user"}
                        </strong>
                      </span>
                    </div>
                    {assignmentVisit.review_notes ? (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                        <p className="font-medium">Review feedback</p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {assignmentVisit.review_notes}
                        </p>
                      </div>
                    ) : null}
                    {canReassignVisit ? (
                    <PermissionGate anyOf={[...SCHEDULE_PERMISSIONS]}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-64 flex-1 space-y-1.5">
                          <Label>Reassign to</Label>
                          <SiteVisitAssigneeSelect
                            value={reassignAssigneeId}
                            onValueChange={setReassignAssigneeId}
                            currentUserId={user?.id}
                            currentUserName={user?.name}
                            placeholder="Select replacement assignee"
                            allActiveUsers
                          />
                        </div>
                        <Button
                          variant={
                            assignmentVisit.status === "revisit_required"
                              ? "destructive"
                              : "outline"
                          }
                          disabled={reassigning || !reassignAssigneeId}
                          onClick={() => void handleReassign(assignmentVisit)}
                        >
                          {reassigning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {assignmentVisit.status === "revisit_required"
                            ? "Reassign for redo"
                            : "Reassign visit"}
                        </Button>
                      </div>
                    </PermissionGate>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {visits.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Production measurement visits</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Open visits in CRM for PM review, or in the field workspace for on-site
                      capture.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visits.map((visit) => {
                      const crmPath = siteVisitDetailPath(visit.id, "crm");
                      const fieldPath = siteVisitDetailPath(visit.id, "field");
                      const preferredPath = siteVisitDetailPath(visit.id, visitWorkspace);
                      const managementPath =
                        mode === "projects"
                          ? projectSiteVisitDetailPath(visit.id)
                          : crmPath;
                      const canStart = canStartFieldVisit(visit.status ?? null);

                      return (
                        <div
                          key={visit.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                        >
                          <div>
                            <p className="font-medium">{visit.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {visit.visit_number ?? `#${visit.id}`}
                              {visit.visit_date
                                ? ` · ${new Date(visit.visit_date).toLocaleDateString()}`
                                : ""}
                              {visit.assigned_field_officer?.name
                                ? ` · ${visit.assigned_field_officer.name}`
                                : ""}
                            </p>
                            {canStart ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Waiting for assignee to start the visit.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <SiteVisitStatusBadge status={visit.status ?? "scheduled"} />
                            <Button size="sm" asChild>
                              <Link href={managementPath}>
                                <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                                View measurements
                              </Link>
                            </Button>
                            {visitWorkspace === "field" ? (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={fieldPath}>
                                  Field view
                                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={preferredPath}>
                                  {permissions.includes("site_visits.execute") ||
                                  roles.includes("field_officer")
                                    ? "Capture measurements"
                                    : "Open visit"}
                                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : null}

              {reviewVisit ? <SiteVisitReviewPanel visit={reviewVisit} /> : null}

              {executableVisit ? (
                <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
                  <UnifiedSiteMeasurementForm
                    visit={executableVisit}
                    project={project}
                    onVisitUpdated={(updated) => {
                      setVisits((current) =>
                        current.map((visit) => (visit.id === updated.id ? updated : visit)),
                      );
                      void loadData();
                    }}
                  />
                </PermissionGate>
              ) : null}

              {approvedVisit && !executableVisit ? (
                <UnifiedSiteMeasurementForm
                  visit={approvedVisit}
                  project={project}
                  onVisitUpdated={(updated) => {
                    setVisits((current) =>
                      current.map((visit) => (visit.id === updated.id ? updated : visit)),
                    );
                    void loadData();
                  }}
                />
              ) : null}

              {!approvedVisit && hasSavedData && project.stage_data?.site_measurement ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Approved measurement snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Production measurements are saved on this project (
                    {project.stage_data.site_measurement.lines?.length ?? 0} lines).
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
