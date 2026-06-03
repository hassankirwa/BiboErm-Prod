"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatLocationType,
  contextualProjectStageLabel,
  formatProjectStage,
  getProjectMaterialStatus,
  hasSiteAssessmentOperationalData,
  normalizeSiteAssessmentMeasurementItem,
  normalizeSiteAssessmentSpatialItem,
  projectHasBomFinalized,
  projectHasBomUploaded,
  projectHasDesignDocument,
  siteAssessmentShapeLabel,
  type ProjectDetail,
  type ProjectMaterialStatus,
  type ProjectStageData,
  type ProjectStageMaterialCheck,
  type SiteAssessmentImage,
  type SiteAssessmentMeasurementItem,
  type SiteAssessmentSpatialItem,
} from "@/lib/api/projects";
import Link from "next/link";
import { useEffect } from "react";
import { Calendar, Check, MapPin, X } from "lucide-react";
import { useMediaImageSrc } from "@/components/media/media-image";
import { ProjectMaterialReserveAction } from "@/components/projects/project-material-reserve-action";

type ProjectDetailOverviewProps = {
  project: ProjectDetail;
  onProjectUpdated?: () => void;
};

export function ProjectDetailOverview({ project, onProjectUpdated }: ProjectDetailOverviewProps) {
  const [materialStatus, setMaterialStatus] = useState<ProjectMaterialStatus | null>(null);
  const stageData = project.stage_data ?? null;

  useEffect(() => {
    let cancelled = false;

    getProjectMaterialStatus(project.id)
      .then((res) => {
        if (!cancelled) setMaterialStatus(res.data);
      })
      .catch(() => {
        if (!cancelled) setMaterialStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, project.stage]);

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <CardTitle className="text-base">Project summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {contextualProjectStageLabel(project.stage, materialStatus?.summary)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {project.priority.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline">{formatLocationType(project.location_type)}</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{project.completion_percent}%</span>
              </div>
              <Progress value={project.completion_percent} className="h-2" />
            </div>

            {project.site_address ? (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {project.site_address}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Quoted</p>
                <p className="font-medium">
                  {project.quoted_amount
                    ? `KES ${Number(project.quoted_amount).toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deposit received</p>
                <p className="font-medium">
                  {project.deposit_received
                    ? `KES ${Number(project.deposit_received).toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected start</p>
                <p className="font-medium">{project.projected_start ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected end</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {project.projected_end ?? "—"}
                </p>
              </div>
            </div>

            {project.client_notes ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Scope / client notes</p>
                <p className="whitespace-pre-wrap">{project.client_notes}</p>
              </div>
            ) : null}

            {project.internal_notes ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Internal notes</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {project.internal_notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {project.stage === "final_design_approval" ? (
          <StageReadinessChecklist project={project} />
        ) : null}

        <StageDataCards
          stageData={stageData}
          projectId={project.id}
          projectStage={project.stage}
        />

        {materialStatus ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Material status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">BOM lines</p>
                  <p className="font-medium">{materialStatus.summary.total_lines}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fully reserved</p>
                  <p className="font-medium">{materialStatus.summary.fully_reserved}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shortage lines</p>
                  <p className="font-medium text-destructive">
                    {materialStatus.summary.shortage_lines}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open requisitions</p>
                  <p className="font-medium">{materialStatus.summary.open_requisitions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Glass orders pending</p>
                  <p className="font-medium">{materialStatus.summary.glass_orders_pending}</p>
                </div>
                {materialStatus.fifo_position ? (
                  <div>
                    <p className="text-xs text-muted-foreground">FIFO queue position</p>
                    <p className="font-medium">#{materialStatus.fifo_position}</p>
                  </div>
                ) : null}
              </div>

              {project.stage_data?.material_check ? (
                <MaterialCheckResults check={project.stage_data.material_check} />
              ) : null}

              <ProjectMaterialReserveAction
                project={project}
                materialStatus={materialStatus}
                onReserved={onProjectUpdated}
              />

              {materialStatus.lines.some((line) => Number(line.shortage_qty) > 0) ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Lines with shortage</p>
                  <div className="divide-y rounded-md border text-sm">
                    {materialStatus.lines
                      .filter((line) => Number(line.shortage_qty) > 0)
                      .map((line) => (
                        <div
                          key={line.bom_line_id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <span>{line.material_name}</span>
                          <span className="text-destructive">
                            Short {line.shortage_qty} (need {line.required_qty}, have{" "}
                            {line.reserved_qty})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
    </div>
  );
}

function MaterialCheckResults({ check }: { check: ProjectStageMaterialCheck }) {
  if (!check.lines?.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Stock check results</p>
        {check.can_fully_reserve ? (
          <Badge variant="outline" className="bg-success/10 text-success">
            Stock available
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            Shortage detected
          </Badge>
        )}
        {check.checked_at ? (
          <span className="text-xs text-muted-foreground">Checked {check.checked_at}</span>
        ) : null}
      </div>
      <div className="divide-y rounded-md border text-sm">
        {check.lines.map((line, index) => {
          const hasShortage = Number(line.shortage ?? 0) > 0;

          return (
            <div
              key={`${line.project_bom_line_id ?? line.item_id ?? index}`}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <span>{line.name ?? line.sku ?? "Line"}</span>
              <span className={hasShortage ? "text-destructive" : "text-success"}>
                {hasShortage
                  ? `Short ${line.shortage} (need ${line.required}, available ${line.effective_available})`
                  : `Available ${line.effective_available} / need ${line.required}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageReadinessChecklist({ project }: { project: ProjectDetail }) {
  const hasDesign = projectHasDesignDocument(project);
  const hasBom = projectHasBomUploaded(project);
  const bomFinalized = projectHasBomFinalized(project);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stage requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ReadinessRow label="Design document" complete={hasDesign} href={`/projects/${project.id}?tab=designs`} />
        <ReadinessRow
          label="BOM uploaded"
          complete={hasBom}
          href={`/projects/${project.id}?tab=bom`}
        />
        <ReadinessRow
          label="BOM finalized"
          complete={bomFinalized}
          href={`/projects/${project.id}?tab=bom`}
        />
      </CardContent>
    </Card>
  );
}

function ReadinessRow({
  label,
  complete,
  href,
}: {
  label: string;
  complete: boolean;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        {complete ? (
          <Check className="h-4 w-4 text-success shrink-0" />
        ) : (
          <X className="h-4 w-4 text-destructive shrink-0" />
        )}
        {label}: {complete ? "✓" : "✗"}
      </span>
      {!complete ? (
        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link href={href}>Complete</Link>
        </Button>
      ) : null}
    </div>
  );
}

function StageDataCards({
  stageData,
  projectId,
  projectStage,
}: {
  stageData: ProjectStageData | null;
  projectId: number;
  projectStage: string;
}) {
  if (!stageData) return null;

  const deposit = stageData.deposit_received;
  const assessment = stageData.site_assessment;

  const hasSalesAssessment =
    assessment &&
    (assessment.doors_count != null ||
      assessment.windows_count != null ||
      assessment.rooms_count != null ||
      assessment.floors_count != null ||
      assessment.measurements ||
      assessment.findings_notes);

  const hasOperationalNotes =
    assessment && hasSiteAssessmentOperationalData(assessment);

  if (!deposit && !hasSalesAssessment && !hasOperationalNotes) return null;

  return (
    <>
      {deposit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deposit confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {deposit.confirmed_at ? (
              <p className="text-xs text-muted-foreground">
                Confirmed on {deposit.confirmed_at}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap">{deposit.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {hasSalesAssessment && assessment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site assessment (sales)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-4">
              <AssessmentStat label="Doors" value={assessment.doors_count} />
              <AssessmentStat label="Windows" value={assessment.windows_count} />
              <AssessmentStat label="Rooms" value={assessment.rooms_count} />
              <AssessmentStat label="Floors" value={assessment.floors_count} />
            </div>
            {assessment.measurements ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Measurements</p>
                <p className="whitespace-pre-wrap">{assessment.measurements}</p>
              </div>
            ) : null}
            {assessment.findings_notes ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Findings</p>
                <p className="whitespace-pre-wrap">{assessment.findings_notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {hasOperationalNotes && assessment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site assessment (operations)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <MeasurementSummary
              label="Doors"
              count={assessment.doors_count}
              items={assessment.doors}
            />
            <MeasurementSummary
              label="Windows"
              count={assessment.windows_count}
              items={assessment.windows}
            />
            <MeasurementSummary
              label="Balconies"
              count={assessment.balconies_count}
              items={assessment.balconies}
              spatial
            />
            <MeasurementSummary
              label="Bathrooms"
              count={assessment.bathrooms_count}
              items={assessment.bathrooms}
              spatial
            />
            {assessment.additional_images && assessment.additional_images.length > 0 ? (
              <AssessmentImagesSummary
                label="Additional site photos"
                images={assessment.additional_images}
              />
            ) : null}
            {assessment.operational_notes ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Operational notes</p>
                <p className="whitespace-pre-wrap">{assessment.operational_notes}</p>
              </div>
            ) : null}
            {assessment.access_constraints ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Access & logistics</p>
                <p className="whitespace-pre-wrap">{assessment.access_constraints}</p>
              </div>
            ) : null}
            {assessment.fabrication_concerns ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fabrication concerns</p>
                <p className="whitespace-pre-wrap">{assessment.fabrication_concerns}</p>
              </div>
            ) : null}
            {assessment.operational_recorded_at ? (
              <p className="text-xs text-muted-foreground">
                Last updated {assessment.operational_recorded_at}
              </p>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/site-assessment`}>
                {projectStage === "site_assessment"
                  ? "Edit site assessment"
                  : "View site assessment"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function AssessmentStat({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">
        {value !== null && value !== undefined ? value : "—"}
      </p>
    </div>
  );
}

function MeasurementSummary({
  label,
  count,
  items,
  spatial = false,
}: {
  label: string;
  count?: number | null;
  items?: SiteAssessmentMeasurementItem[] | SiteAssessmentSpatialItem[];
  spatial?: boolean;
}) {
  const resolvedCount = count ?? items?.length ?? 0;
  if (!resolvedCount && !(items?.length ?? 0)) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {label} ({resolvedCount})
      </p>
      {items && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => {
            const spatialItem = spatial
              ? normalizeSiteAssessmentSpatialItem(item as SiteAssessmentSpatialItem)
              : null;

            return (
              <div key={`${label}-${index}`} className="min-w-0 rounded-md border px-3 py-2">
                <p className="text-sm font-medium">{item.label}</p>
                {spatialItem ? (
                  <>
                    <p className="text-muted-foreground">
                      Shape: {siteAssessmentShapeLabel(spatialItem.shape)}
                    </p>
                    <p className="text-muted-foreground">
                      {formatSpatialMeasurement(spatialItem)}
                    </p>
                    {spatialItem.dimensions_description ? (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {spatialItem.dimensions_description}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    {formatMeasurement(item.width_ft, item.height_ft, item)}
                  </p>
                )}
                {item.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.notes}</p>
                ) : null}
                {spatialItem && (spatialItem.images?.length ?? 0) > 0 ? (
                  <AssessmentImagesSummary images={spatialItem.images ?? []} compact />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AssessmentImagesSummary({
  label,
  images,
  compact = false,
}: {
  label?: string;
  images: SiteAssessmentImage[];
  compact?: boolean;
}) {
  if (images.length === 0) return null;

  return (
    <div className={compact ? "mt-2 space-y-2" : "space-y-2"}>
      {label ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
      <div
        className={`grid gap-2 ${
          compact
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {images.map((image) => (
          <SiteAssessmentImagePreview
            key={image.path}
            image={image}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function SiteAssessmentImagePreview({
  image,
  compact,
}: {
  image: SiteAssessmentImage;
  compact: boolean;
}) {
  const { displaySrc, loading, onError } = useMediaImageSrc(image.url);
  const heightClass = compact ? "h-20" : "h-28";

  const content =
    displaySrc && !loading ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt={image.original_name}
        className={`w-full object-cover ${heightClass}`}
        onError={onError}
      />
    ) : (
      <div
        className={`flex items-center justify-center px-2 text-xs text-muted-foreground ${heightClass}`}
      >
        {loading ? "Loading…" : image.original_name}
      </div>
    );

  if (!displaySrc) {
    return (
      <div className="overflow-hidden rounded-md border bg-muted/30">{content}</div>
    );
  }

  return (
    <a
      href={displaySrc}
      target="_blank"
      rel="noopener noreferrer"
      className="overflow-hidden rounded-md border bg-muted/30"
    >
      {content}
    </a>
  );
}

function formatSpatialMeasurement(item: SiteAssessmentSpatialItem): string {
  const shape = item.shape ?? "rectangle";
  const parts: string[] = [];

  if (shape === "rectangle" || shape === "l_shape") {
    parts.push(formatMeasurement(item.width_ft, item.height_ft, item));
  }

  if (item.side_measurements_ft?.length) {
    const sides = item.side_measurements_ft
      .filter((value) => value != null)
      .map((value) => `${value} ft`)
      .join(", ");
    if (sides) {
      parts.push(`Sides: ${sides}`);
    }
  }

  if (parts.length === 0) {
    return item.dimensions_description?.trim() || "No measurements recorded";
  }

  return parts.join(" · ");
}

function formatMeasurement(
  width?: number | null,
  height?: number | null,
  rawItem?: SiteAssessmentMeasurementItem & {
    width_mm?: number | null;
    height_mm?: number | null;
  },
): string {
  const normalized = rawItem
    ? normalizeSiteAssessmentMeasurementItem(rawItem)
    : { width_ft: width ?? null, height_ft: height ?? null };
  const widthFt = normalized.width_ft;
  const heightFt = normalized.height_ft;

  if (widthFt == null && heightFt == null) return "No measurements recorded";
  if (widthFt != null && heightFt != null) return `${widthFt} ft × ${heightFt} ft`;
  if (widthFt != null) return `${widthFt} ft wide`;
  return `${heightFt} ft high`;
}
