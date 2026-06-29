"use client";

import Link from "next/link";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Loader2,
  MapPin,
  Play,
  Ruler,
  User,
} from "lucide-react";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dealDisplayName } from "@/lib/api/crm/deals";
import type { ApiSiteVisit } from "@/lib/api/crm/site-visits";
import {
  siteVisitDetailPath,
  type SiteVisitWorkspace,
} from "@/lib/crm/site-visit-paths";
import {
  canStartFieldVisit,
  resolveFieldOfficerName,
} from "@/lib/crm/site-visit-utils";

type FieldOpenVisitCardProps = {
  visit: ApiSiteVisit;
  workspace?: SiteVisitWorkspace;
  onStartVisit?: (visitId: number) => void;
  actionLoading?: number | null;
};

function visitContextLabel(visit: ApiSiteVisit): string | null {
  if (visit.deal) return dealDisplayName(visit.deal);
  if (visit.lead?.name?.trim()) return visit.lead.name.trim();
  if (visit.lead?.lead_number) return visit.lead.lead_number;
  return null;
}

export function FieldOpenVisitCard({
  visit,
  workspace = "field",
  onStartVisit,
  actionLoading = null,
}: FieldOpenVisitCardProps) {
  const detailPath = (visitId: number) => siteVisitDetailPath(visitId, workspace);
  const status = visit.status ?? "scheduled";
  const showStart = canStartFieldVisit(status) && onStartVisit != null;
  // Check raw visit.status so null/undefined never silently falls through to "scheduled"
  const showLog = visit.status === "in_progress" || visit.status === "measurements_captured";
  const contextLabel = visitContextLabel(visit);
  const officerName = resolveFieldOfficerName(
    visit.assigned_field_officer,
    visit.assigned_field_officer_id,
    [],
  );
  const measurementLines = visit.measurement_form_data?.lines ?? [];
  const hasMeasurements = measurementLines.length > 0;
  const measurementContext =
    visit.measurement_context === "production" ? "Production" : "Quotation";
  const measurementLabel = hasMeasurements
    ? "Continue measurements"
    : "Log measurements";

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{visit.title}</CardTitle>
            {contextLabel && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                {contextLabel}
                {visit.deal?.account?.name ? ` · ${visit.deal.account.name}` : ""}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{measurementContext} measurement</p>
            <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {visit.visit_date
                  ? new Date(visit.visit_date).toLocaleDateString()
                  : "-"}
                {visit.visit_time ? ` · ${visit.visit_time}` : ""}
              </span>
              {visit.visit_number && (
                <span className="text-xs">{visit.visit_number}</span>
              )}
            </p>
          </div>
          <SiteVisitStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {officerName && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>
              Assigned to <span className="font-medium text-foreground">{officerName}</span>
            </span>
          </p>
        )}

        {visit.site_address && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {visit.site_address}
          </p>
        )}

        {visit.deal?.requirement_summary && (
          <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            {visit.deal.requirement_summary}
          </p>
        )}

        {visit.notes_for_field_officer && (
          <p className="rounded-md border border-dashed border-border/80 p-3 text-sm text-muted-foreground">
            {visit.notes_for_field_officer}
          </p>
        )}

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Ruler className="h-4 w-4 text-primary" />
            Measurements
          </p>
          {measurementLines.length > 0 ? (
            <ul className="space-y-1.5 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm">
              {measurementLines.map((line, index) => (
                <li key={index} className="text-muted-foreground">
                  {[line.ref, line.room_location, line.product_type]
                    .filter(Boolean)
                    .join(" · ") || `Line ${index + 1}`}
                  {(line.width_centre_mm || line.height_centre_mm) && (
                    <span>
                      {" "}
                      — {line.width_centre_mm ?? "—"} × {line.height_centre_mm ?? "—"} mm
                    </span>
                  )}
                  {line.remarks?.trim() && (
                    <span className="block text-xs">Remarks: {line.remarks}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No measurements logged yet.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {showLog && (
            <Button size="sm" variant="default" asChild>
              <Link href={`${detailPath(visit.id)}#log-details`}>
                <ClipboardList className="mr-2 h-4 w-4" />
                {measurementLabel}
              </Link>
            </Button>
          )}

          {showStart && (
            <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
              <Button
                size="sm"
                disabled={actionLoading === visit.id}
                onClick={() => onStartVisit?.(visit.id)}
              >
                {actionLoading === visit.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start visit
              </Button>
            </PermissionGate>
          )}

          <Button size="sm" variant="outline" asChild>
            <Link href={detailPath(visit.id)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              View visit
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
