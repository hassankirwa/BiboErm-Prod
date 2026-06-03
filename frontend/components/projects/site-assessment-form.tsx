"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteSiteAssessmentImage,
  normalizeSiteAssessmentMeasurementItems,
  normalizeSiteAssessmentSpatialItems,
  sideCountForShape,
  SITE_ASSESSMENT_SHAPE_OPTIONS,
  updateProjectSiteAssessmentNotes,
  uploadSiteAssessmentImage,
  type ProjectDetail,
  type ProjectStageSiteAssessment,
  type SiteAssessmentImage,
  type SiteAssessmentMeasurementItem,
  type SiteAssessmentNotesPayload,
  type SiteAssessmentShape,
  type SiteAssessmentSpatialItem,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { MediaImage } from "@/components/media/media-image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type SiteAssessmentFormProps = {
  project: ProjectDetail;
  readOnly?: boolean;
  onProjectUpdated?: (project: ProjectDetail) => void;
};

type FormState = {
  doors_count: number;
  doors: SiteAssessmentMeasurementItem[];
  windows_count: number;
  windows: SiteAssessmentMeasurementItem[];
  balconies_count: number;
  balconies: SiteAssessmentSpatialItem[];
  bathrooms_count: number;
  bathrooms: SiteAssessmentSpatialItem[];
  additional_images: SiteAssessmentImage[];
  operational_notes: string;
  access_constraints: string;
  fabrication_concerns: string;
};

const EMPTY_FORM: FormState = {
  doors_count: 0,
  doors: [],
  windows_count: 0,
  windows: [],
  balconies_count: 0,
  balconies: [],
  bathrooms_count: 0,
  bathrooms: [],
  additional_images: [],
  operational_notes: "",
  access_constraints: "",
  fabrication_concerns: "",
};

export function SiteAssessmentForm({
  project,
  readOnly = false,
  onProjectUpdated,
}: SiteAssessmentFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildFormState(project.stage_data?.site_assessment));
    // Only re-init when switching projects — not when stage_data reference changes mid-edit.
  }, [project.id]);

  const canSave = useMemo(() => {
    const hasCounts =
      form.doors_count > 0 ||
      form.windows_count > 0 ||
      form.balconies_count > 0 ||
      form.bathrooms_count > 0;

    const hasNotes =
      form.operational_notes.trim() !== "" ||
      form.access_constraints.trim() !== "" ||
      form.fabrication_concerns.trim() !== "";

    const hasImages =
      form.additional_images.length > 0 ||
      form.balconies.some((item) => (item.images?.length ?? 0) > 0) ||
      form.bathrooms.some((item) => (item.images?.length ?? 0) > 0);

    return hasCounts || hasNotes || hasImages;
  }, [form]);

  function updateCount(
    field: "doors_count" | "windows_count" | "balconies_count" | "bathrooms_count",
    itemsField: "doors" | "windows" | "balconies" | "bathrooms",
    labelPrefix: string,
    rawValue: string,
  ) {
    // Clearing the field while typing (e.g. 4 → backspace → 6) must not wipe existing items.
    if (rawValue === "") {
      setForm((current) => ({ ...current, [field]: 0 }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    const count = Math.max(0, Math.floor(parsed));
    setForm((current) => ({
      ...current,
      [field]: count,
      [itemsField]:
        itemsField === "balconies" || itemsField === "bathrooms"
          ? resizeSpatialItems(count, current[itemsField], labelPrefix)
          : resizeMeasurementItems(count, current[itemsField], labelPrefix),
    }));
  }

  function restoreCountIfEmpty(
    field: "doors_count" | "windows_count" | "balconies_count" | "bathrooms_count",
    itemsField: "doors" | "windows" | "balconies" | "bathrooms",
  ) {
    setForm((current) => {
      if (current[field] !== 0 || current[itemsField].length === 0) return current;
      return { ...current, [field]: current[itemsField].length };
    });
  }

  function updateItem(
    itemsField: "doors" | "windows",
    index: number,
    patch: Partial<SiteAssessmentMeasurementItem>,
  ) {
    setForm((current) => ({
      ...current,
      [itemsField]: current[itemsField].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateSpatialItem(
    itemsField: "balconies" | "bathrooms",
    index: number,
    patch: Partial<SiteAssessmentSpatialItem>,
  ) {
    setForm((current) => ({
      ...current,
      [itemsField]: current[itemsField].map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = { ...item, ...patch };

        if (patch.shape && patch.shape !== item.shape) {
          const sideCount = sideCountForShape(patch.shape);
          next.side_measurements_ft =
            sideCount > 0
              ? Array.from({ length: sideCount }, (_, sideIndex) =>
                  item.side_measurements_ft?.[sideIndex] ?? null,
                )
              : null;
        }

        return next;
      }),
    }));
  }

  function setItemImages(
    itemsField: "balconies" | "bathrooms",
    index: number,
    images: SiteAssessmentImage[],
  ) {
    updateSpatialItem(itemsField, index, { images });
  }

  async function handleSubmit() {
    if (readOnly || !canSave) return;

    setSaving(true);
    try {
      const payload: SiteAssessmentNotesPayload = {
        doors_count: form.doors_count,
        doors: form.doors,
        windows_count: form.windows_count,
        windows: form.windows,
        balconies_count: form.balconies_count,
        balconies: form.balconies,
        bathrooms_count: form.bathrooms_count,
        bathrooms: form.bathrooms,
        additional_images: form.additional_images,
        operational_notes: form.operational_notes.trim() || undefined,
        access_constraints: form.access_constraints.trim() || undefined,
        fabrication_concerns: form.fabrication_concerns.trim() || undefined,
      };

      const response = await updateProjectSiteAssessmentNotes(project.id, payload);
      onProjectUpdated?.(response.data);
      router.replace(
        `/projects/${project.id}?saved=site-assessment&tab=overview`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to save site assessment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Record opening counts and measurements (in feet) for design and BOM planning. Sales
        findings from stage advancement are preserved separately on the project overview.
      </p>

      <MeasurementSection
        title="Doors"
        count={form.doors_count}
        items={form.doors}
        readOnly={readOnly}
        onCountChange={(value) => updateCount("doors_count", "doors", "Door", value)}
        onCountBlur={() => restoreCountIfEmpty("doors_count", "doors")}
        onItemChange={(index, patch) => updateItem("doors", index, patch)}
      />

      <MeasurementSection
        title="Windows"
        count={form.windows_count}
        items={form.windows}
        readOnly={readOnly}
        onCountChange={(value) => updateCount("windows_count", "windows", "Window", value)}
        onCountBlur={() => restoreCountIfEmpty("windows_count", "windows")}
        onItemChange={(index, patch) => updateItem("windows", index, patch)}
      />

      <SpatialMeasurementSection
        title="Balconies"
        count={form.balconies_count}
        items={form.balconies}
        readOnly={readOnly}
        projectId={project.id}
        onCountChange={(value) =>
          updateCount("balconies_count", "balconies", "Balcony", value)
        }
        onCountBlur={() => restoreCountIfEmpty("balconies_count", "balconies")}
        onItemChange={(index, patch) => updateSpatialItem("balconies", index, patch)}
        onImagesChange={(index, images) => setItemImages("balconies", index, images)}
      />

      <SpatialMeasurementSection
        title="Bathrooms"
        count={form.bathrooms_count}
        items={form.bathrooms}
        readOnly={readOnly}
        projectId={project.id}
        onCountChange={(value) =>
          updateCount("bathrooms_count", "bathrooms", "Bathroom", value)
        }
        onCountBlur={() => restoreCountIfEmpty("bathrooms_count", "bathrooms")}
        onItemChange={(index, patch) => updateSpatialItem("bathrooms", index, patch)}
        onImagesChange={(index, images) => setItemImages("bathrooms", index, images)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional images</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            General site assessment photos not tied to a specific balcony or bathroom.
          </p>
          <AssessmentImageUpload
            projectId={project.id}
            images={form.additional_images}
            readOnly={readOnly}
            onChange={(images) =>
              setForm((current) => ({ ...current, additional_images: images }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operational-notes">Operational notes</Label>
            <Textarea
              id="operational-notes"
              rows={4}
              placeholder="Site conditions, frame types, installation constraints, coordination with client…"
              value={form.operational_notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  operational_notes: event.target.value,
                }))
              }
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="access-constraints">Access & logistics</Label>
            <Textarea
              id="access-constraints"
              rows={3}
              placeholder="Parking, lift access, working hours, security clearance…"
              value={form.access_constraints}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  access_constraints: event.target.value,
                }))
              }
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fabrication-concerns">Fabrication concerns</Label>
            <Textarea
              id="fabrication-concerns"
              rows={3}
              placeholder="Non-standard profiles, tolerance risks, glass sizing notes…"
              value={form.fabrication_concerns}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fabrication_concerns: event.target.value,
                }))
              }
              readOnly={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving || !canSave}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save site assessment
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MeasurementSection({
  title,
  count,
  items,
  readOnly,
  onCountChange,
  onCountBlur,
  onItemChange,
}: {
  title: string;
  count: number;
  items: SiteAssessmentMeasurementItem[];
  readOnly: boolean;
  onCountChange: (value: string) => void;
  onCountBlur: () => void;
  onItemChange: (index: number, patch: Partial<SiteAssessmentMeasurementItem>) => void;
}) {
  const countId = `${title.toLowerCase()}-count`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor={countId}>How many {title.toLowerCase()}?</Label>
          <Input
            id={countId}
            type="number"
            min={0}
            inputMode="numeric"
            value={count || ""}
            onChange={(event) => onCountChange(event.target.value)}
            onBlur={onCountBlur}
            readOnly={readOnly}
          />
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => (
              <div
                key={`${title}-${index}`}
                className="min-w-0 space-y-3 rounded-lg border p-4"
              >
                <p className="text-sm font-medium">{item.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${countId}-${index}-width`}>Width (ft)</Label>
                    <Input
                      id={`${countId}-${index}-width`}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      placeholder="e.g. 3.5"
                      value={item.width_ft ?? ""}
                      onChange={(event) =>
                        onItemChange(index, {
                          width_ft: parseOptionalNumber(event.target.value),
                        })
                      }
                      readOnly={readOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${countId}-${index}-height`}>Height (ft)</Label>
                    <Input
                      id={`${countId}-${index}-height`}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      placeholder="e.g. 3.5"
                      value={item.height_ft ?? ""}
                      onChange={(event) =>
                        onItemChange(index, {
                          height_ft: parseOptionalNumber(event.target.value),
                        })
                      }
                      readOnly={readOnly}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${countId}-${index}-notes`}>Notes</Label>
                  <Textarea
                    id={`${countId}-${index}-notes`}
                    rows={2}
                    placeholder="Opening details, frame type, glazing notes…"
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      onItemChange(index, { notes: event.target.value })
                    }
                    readOnly={readOnly}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a count above to add measurement fields for each {title.toLowerCase().slice(0, -1)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SpatialMeasurementSection({
  title,
  count,
  items,
  readOnly,
  projectId,
  onCountChange,
  onCountBlur,
  onItemChange,
  onImagesChange,
}: {
  title: string;
  count: number;
  items: SiteAssessmentSpatialItem[];
  readOnly: boolean;
  projectId: number;
  onCountChange: (value: string) => void;
  onCountBlur: () => void;
  onItemChange: (index: number, patch: Partial<SiteAssessmentSpatialItem>) => void;
  onImagesChange: (index: number, images: SiteAssessmentImage[]) => void;
}) {
  const countId = `${title.toLowerCase()}-count`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor={countId}>How many {title.toLowerCase()}?</Label>
          <Input
            id={countId}
            type="number"
            min={0}
            inputMode="numeric"
            value={count || ""}
            onChange={(event) => onCountChange(event.target.value)}
            onBlur={onCountBlur}
            readOnly={readOnly}
          />
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => {
              const shape = item.shape ?? "rectangle";
              const sideCount = sideCountForShape(shape);
              const showRectangleDims = shape === "rectangle" || shape === "l_shape";

              return (
                <div
                  key={`${title}-${index}`}
                  className="min-w-0 space-y-3 rounded-lg border p-4"
                >
                  <p className="text-sm font-medium">{item.label}</p>

                  <div className="space-y-2">
                    <Label htmlFor={`${countId}-${index}-shape`}>Shape</Label>
                    <Select
                      value={shape}
                      onValueChange={(value) =>
                        onItemChange(index, { shape: value as SiteAssessmentShape })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger id={`${countId}-${index}-shape`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SITE_ASSESSMENT_SHAPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {showRectangleDims ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${countId}-${index}-width`}>
                          {shape === "l_shape" ? "Main width (ft)" : "Width (ft)"}
                        </Label>
                        <Input
                          id={`${countId}-${index}-width`}
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          placeholder="e.g. 3.5"
                          value={item.width_ft ?? ""}
                          onChange={(event) =>
                            onItemChange(index, {
                              width_ft: parseOptionalNumber(event.target.value),
                            })
                          }
                          readOnly={readOnly}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${countId}-${index}-height`}>
                          {shape === "l_shape" ? "Main depth (ft)" : "Height (ft)"}
                        </Label>
                        <Input
                          id={`${countId}-${index}-height`}
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          placeholder="e.g. 3.5"
                          value={item.height_ft ?? ""}
                          onChange={(event) =>
                            onItemChange(index, {
                              height_ft: parseOptionalNumber(event.target.value),
                            })
                          }
                          readOnly={readOnly}
                        />
                      </div>
                    </div>
                  ) : null}

                  {sideCount > 0 ? (
                    <div className="space-y-2">
                      <Label>Side lengths (ft)</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {Array.from({ length: sideCount }, (_, sideIndex) => (
                          <div key={sideIndex} className="space-y-2">
                            <Label htmlFor={`${countId}-${index}-side-${sideIndex}`}>
                              Side {sideIndex + 1}
                            </Label>
                            <Input
                              id={`${countId}-${index}-side-${sideIndex}`}
                              type="number"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              value={item.side_measurements_ft?.[sideIndex] ?? ""}
                              onChange={(event) => {
                                const next = [...(item.side_measurements_ft ?? [])];
                                while (next.length < sideCount) next.push(null as never);
                                next[sideIndex] = parseOptionalNumber(event.target.value);
                                onItemChange(index, { side_measurements_ft: next });
                              }}
                              readOnly={readOnly}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {shape !== "rectangle" ? (
                    <div className="space-y-2">
                      <Label htmlFor={`${countId}-${index}-dimensions`}>
                        Dimensions description
                      </Label>
                      <Textarea
                        id={`${countId}-${index}-dimensions`}
                        rows={2}
                        placeholder="Describe layout, angles, or non-standard measurements…"
                        value={item.dimensions_description ?? ""}
                        onChange={(event) =>
                          onItemChange(index, {
                            dimensions_description: event.target.value,
                          })
                        }
                        readOnly={readOnly}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor={`${countId}-${index}-notes`}>Notes</Label>
                    <Textarea
                      id={`${countId}-${index}-notes`}
                      rows={2}
                      placeholder="Opening details, frame type, glazing notes…"
                      value={item.notes ?? ""}
                      onChange={(event) =>
                        onItemChange(index, { notes: event.target.value })
                      }
                      readOnly={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Photos</Label>
                    <AssessmentImageUpload
                      projectId={projectId}
                      images={item.images ?? []}
                      readOnly={readOnly}
                      onChange={(images) => onImagesChange(index, images)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a count above to add measurement fields for each {title.toLowerCase().slice(0, -1)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentImageUpload({
  projectId,
  images,
  readOnly,
  onChange,
}: {
  projectId: number;
  images: SiteAssessmentImage[];
  readOnly: boolean;
  onChange: (images: SiteAssessmentImage[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const response = await uploadSiteAssessmentImage(projectId, file);
      onChange([...images, response.data]);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove(image: SiteAssessmentImage) {
    setRemovingPath(image.path);
    try {
      if (!readOnly) {
        await deleteSiteAssessmentImage(projectId, image.path);
      }
      onChange(images.filter((entry) => entry.path !== image.path));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove image.");
    } finally {
      setRemovingPath(null);
    }
  }

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.path}
              className="relative overflow-hidden rounded-lg border bg-muted/30"
            >
              <MediaImage
                src={image.url}
                alt={image.original_name}
                className="h-32 w-full object-cover"
                fallback={
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    {image.original_name}
                  </div>
                }
              />
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="truncate text-xs text-muted-foreground">{image.original_name}</p>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={removingPath === image.path}
                    onClick={() => void handleRemove(image)}
                  >
                    {removingPath === image.path ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
      )}

      {!readOnly ? (
        <>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Add photo"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function buildFormState(assessment?: ProjectStageSiteAssessment | null): FormState {
  if (!assessment) return EMPTY_FORM;

  const doorsCount = assessment.doors_count ?? assessment.doors?.length ?? 0;
  const windowsCount = assessment.windows_count ?? assessment.windows?.length ?? 0;
  const balconiesCount = assessment.balconies_count ?? assessment.balconies?.length ?? 0;
  const bathroomsCount = assessment.bathrooms_count ?? assessment.bathrooms?.length ?? 0;

  return {
    doors_count: doorsCount,
    doors: resizeMeasurementItems(
      doorsCount,
      normalizeSiteAssessmentMeasurementItems(assessment.doors),
      "Door",
    ),
    windows_count: windowsCount,
    windows: resizeMeasurementItems(
      windowsCount,
      normalizeSiteAssessmentMeasurementItems(assessment.windows),
      "Window",
    ),
    balconies_count: balconiesCount,
    balconies: resizeSpatialItems(
      balconiesCount,
      normalizeSiteAssessmentSpatialItems(assessment.balconies),
      "Balcony",
    ),
    bathrooms_count: bathroomsCount,
    bathrooms: resizeSpatialItems(
      bathroomsCount,
      normalizeSiteAssessmentSpatialItems(assessment.bathrooms),
      "Bathroom",
    ),
    additional_images: assessment.additional_images ?? [],
    operational_notes: assessment.operational_notes ?? "",
    access_constraints: assessment.access_constraints ?? "",
    fabrication_concerns: assessment.fabrication_concerns ?? "",
  };
}

function createEmptyMeasurementItem(
  labelPrefix: string,
  index: number,
): SiteAssessmentMeasurementItem {
  return {
    label: `${labelPrefix} ${index + 1}`,
    width_ft: null,
    height_ft: null,
    notes: "",
  };
}

function createEmptySpatialItem(labelPrefix: string, index: number): SiteAssessmentSpatialItem {
  return {
    label: `${labelPrefix} ${index + 1}`,
    shape: "rectangle",
    width_ft: null,
    height_ft: null,
    notes: "",
    dimensions_description: "",
    side_measurements_ft: null,
    images: [],
  };
}

function resizeItems<T>(existing: T[], newCount: number, createEmpty: (index: number) => T): T[] {
  if (newCount <= existing.length) {
    return existing.slice(0, newCount);
  }

  return [
    ...existing,
    ...Array.from({ length: newCount - existing.length }, (_, offset) =>
      createEmpty(existing.length + offset),
    ),
  ];
}

export function resizeMeasurementItems(
  count: number,
  existing: SiteAssessmentMeasurementItem[],
  labelPrefix: string,
): SiteAssessmentMeasurementItem[] {
  return resizeItems(existing, count, (index) => createEmptyMeasurementItem(labelPrefix, index)).map(
    (item, index) => ({
      ...item,
      label: item.label || `${labelPrefix} ${index + 1}`,
    }),
  );
}

export function resizeSpatialItems(
  count: number,
  existing: SiteAssessmentSpatialItem[],
  labelPrefix: string,
): SiteAssessmentSpatialItem[] {
  return resizeItems(existing, count, (index) => createEmptySpatialItem(labelPrefix, index)).map(
    (item, index) => ({
      ...item,
      label: item.label || `${labelPrefix} ${index + 1}`,
      shape: item.shape ?? "rectangle",
      images: item.images ?? [],
    }),
  );
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
