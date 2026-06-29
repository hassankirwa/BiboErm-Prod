"use client";

import { Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiSiteVisit } from "@/lib/api/crm/site-visits";
import { contextLabel, resolveMeasurementContext } from "@/lib/measurements/adapters";
import { hasSiteMeasurementFormData } from "@/lib/measurements/types";

type SiteVisitReviewPanelProps = {
  visit: ApiSiteVisit;
};

export function SiteVisitReviewPanel({ visit }: SiteVisitReviewPanelProps) {
  const form = visit.measurement_form_data;
  const hasForm = hasSiteMeasurementFormData(form);
  const context = resolveMeasurementContext(visit);

  if (!hasForm) {
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
            No measurements recorded yet.
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
          {contextLabel(context)} Review captured data before approving.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">Client:</span> {form?.client_name || "—"}
          </p>
          <p>
            <span className="font-medium">Project:</span> {form?.project_name || "—"}
          </p>
          <p>
            <span className="font-medium">Measured by:</span> {form?.measured_by || "—"}
          </p>
          <p>
            <span className="font-medium">Lines:</span> {form?.lines?.length ?? 0}
          </p>
        </div>

        <ul className="space-y-1.5 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm">
          {(form?.lines ?? []).map((line, index) => (
            <li key={index} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {line.ref || index + 1}
              </span>
              {" — "}
              {[line.room_location, line.product_type].filter(Boolean).join(" · ") || "Opening"}
              {" · "}
              Qty {line.quantity ?? 1}
              {(line.width_centre_mm || line.height_centre_mm) && (
                <span>
                  {" · "}
                  {line.width_centre_mm ?? "—"} × {line.height_centre_mm ?? "—"} mm
                </span>
              )}
              {line.remarks?.trim() && (
                <span className="block text-xs">Remarks: {line.remarks}</span>
              )}
            </li>
          ))}
        </ul>

        {form?.operational_notes?.trim() && (
          <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Operational notes: </span>
            {form.operational_notes}
          </p>
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
