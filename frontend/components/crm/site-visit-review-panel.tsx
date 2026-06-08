"use client";

import { Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiSiteVisit } from "@/lib/api/crm/site-visits";
import type { ProjectStageSiteAssessment } from "@/lib/api/projects";
import { formatMeasurementLineSummary } from "@/lib/crm/site-visit-utils";

type SiteVisitReviewPanelProps = {
  visit: ApiSiteVisit;
};

function formatOpening(
  label: string,
  width: number | null | undefined,
  height: number | null | undefined,
  notes?: string | null,
): string {
  const dims =
    width != null || height != null
      ? `${width ?? "—"} × ${height ?? "—"} ft`
      : "dimensions not recorded";
  const notePart = notes?.trim() ? ` — ${notes.trim()}` : "";
  return `${label}: ${dims}${notePart}`;
}

function AssessmentSection({
  title,
  assessment,
  keyName,
}: {
  title: string;
  assessment: ProjectStageSiteAssessment;
  keyName: "doors" | "windows" | "balconies" | "bathrooms";
}) {
  const count = assessment[`${keyName}_count`] ?? assessment[keyName]?.length ?? 0;
  const items = assessment[keyName] ?? [];
  if (!count && items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">Count: {count || items.length}</p>
      {items.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm">
          {items.map((item, index) => (
            <li key={`${keyName}-${index}`} className="text-muted-foreground">
              {formatOpening(
                item.label ?? `${title} ${index + 1}`,
                item.width_ft,
                item.height_ft,
                item.notes,
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SiteVisitReviewPanel({ visit }: SiteVisitReviewPanelProps) {
  const lines = visit.measurement_lines ?? [];
  const assessment = visit.deal?.site_assessment ?? null;
  const hasLines = lines.length > 0;
  const hasAssessment =
    assessment != null &&
    ((assessment.doors_count ?? 0) > 0 ||
      (assessment.windows_count ?? 0) > 0 ||
      (assessment.balconies_count ?? 0) > 0 ||
      (assessment.bathrooms_count ?? 0) > 0 ||
      (assessment.doors?.length ?? 0) > 0 ||
      (assessment.windows?.length ?? 0) > 0 ||
      assessment.operational_notes?.trim() ||
      assessment.access_constraints?.trim() ||
      assessment.fabrication_concerns?.trim());

  if (!hasLines && !hasAssessment) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4 text-primary" />
            Field measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No measurements or site assessment recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-4 w-4 text-primary" />
          Field measurements
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review captured data before approving. Approved visits move the deal forward for
          quotation.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasLines && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Visit measurement lines</p>
            <ul className="space-y-1.5 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm">
              {lines.map((line, index) => (
                <li key={line.id ?? index} className="text-muted-foreground">
                  {formatMeasurementLineSummary(line)}
                  {line.installation_notes?.trim() && (
                    <span className="block text-xs">Notes: {line.installation_notes}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasAssessment && assessment && (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">Deal site assessment</p>
            <AssessmentSection title="Doors" assessment={assessment} keyName="doors" />
            <AssessmentSection title="Windows" assessment={assessment} keyName="windows" />
            <AssessmentSection title="Balconies" assessment={assessment} keyName="balconies" />
            <AssessmentSection title="Bathrooms" assessment={assessment} keyName="bathrooms" />
            {assessment.operational_notes?.trim() && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Operational notes: </span>
                {assessment.operational_notes}
              </p>
            )}
            {assessment.access_constraints?.trim() && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Access: </span>
                {assessment.access_constraints}
              </p>
            )}
            {assessment.fabrication_concerns?.trim() && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Fabrication: </span>
                {assessment.fabrication_concerns}
              </p>
            )}
          </div>
        )}

        {visit.field_officer_notes?.trim() && (
          <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Field officer notes: </span>
            {visit.field_officer_notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
