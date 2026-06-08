"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  normalizeSiteAssessmentMeasurementItems,
  normalizeSiteAssessmentSpatialItems,
  sideCountForShape,
  SITE_ASSESSMENT_SHAPE_OPTIONS,
  type ProjectStageSiteAssessment,
  type SiteAssessmentImage,
  type SiteAssessmentMeasurementItem,
  type SiteAssessmentNotesPayload,
  type SiteAssessmentShape,
  type SiteAssessmentSpatialItem,
} from "@/lib/api/projects";
import {
  resizeMeasurementItems,
  resizeSpatialItems,
} from "@/components/projects/site-assessment-form";
import {
  updateDealSiteAssessment,
  uploadDealSiteAssessmentImage,
  deleteDealSiteAssessmentImage,
} from "@/lib/api/crm/deals";
import {
  fetchSiteVisit,
  submitSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { MediaImage } from "@/components/media/media-image";
import { CheckCircle2, ClipboardList, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { ApiDeal } from "@/lib/api/crm/types";

type DealSiteAssessmentFormProps = {
  deal: ApiDeal;
  visit: ApiSiteVisit;
  onDealUpdated: (deal: ApiDeal) => void;
  onVisitUpdated: (visit: ApiSiteVisit) => void;
  sectionId?: string;
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

export function DealSiteAssessmentForm({
  deal,
  visit,
  onDealUpdated,
  onVisitUpdated,
  sectionId = "log-details",
}: DealSiteAssessmentFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    buildFormState(deal.site_assessment),
  );
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildFormState(deal.site_assessment));
    setLastSavedAt(deal.site_assessment ? deal.updated_at ?? null : null);
  }, [deal.id]);

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
      [itemsField]: current[itemsField].map((item, i) =>
        i === index ? { ...item, ...patch } : item,
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
      [itemsField]: current[itemsField].map((item, i) => {
        if (i !== index) return item;

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

  async function handleSaveAssessment() {
    if (!canSave) return;

    setSaving(true);
    try {
      await ensureCsrfCookie();
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

      const updated = await updateDealSiteAssessment(deal.id, payload);
      const assessment = updated.site_assessment ?? payload;
      onDealUpdated({ ...updated, site_assessment: assessment });
      setForm(buildFormState(assessment));
      setLastSavedAt(new Date().toISOString());

      try {
        const refreshedVisit = await fetchSiteVisit(visit.id);
        onVisitUpdated(refreshedVisit);
      } catch {
        // Visit refresh is best-effort; deal save already succeeded.
      }

      toast.success(
        "Site assessment saved and linked to this visit. You can mark the visit done for sales.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to save site assessment.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkVisitDone() {
    setCompleting(true);
    try {
      await ensureCsrfCookie();
      const updated = await submitSiteVisit(visit.id, {
        follow_up_required: false,
      });
      onVisitUpdated(updated);
      setConfirmCompleteOpen(false);
      toast.success("Field visit marked done. Sent to sales for review.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to complete visit.",
      );
    } finally {
      setCompleting(false);
    }
  }

  return (
    <section
      id={sectionId}
      className="scroll-mt-24 space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5"
    >
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-[#1e3a5f]">
          <ClipboardList className="h-5 w-5" />
          Site assessment
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Record opening counts and measurements (in feet) for design and BOM planning.
          Save the assessment, then mark the visit done when finished.
        </p>
      </div>

      {(lastSavedAt || deal.site_assessment) && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          <p className="font-medium">Saved on deal</p>
          <p className="mt-0.5 text-green-800/90">
            {[
              form.doors_count > 0 ? `${form.doors_count} door(s)` : null,
              form.windows_count > 0 ? `${form.windows_count} window(s)` : null,
              form.balconies_count > 0
                ? `${form.balconies_count} balcony/balconies`
                : null,
              form.bathrooms_count > 0 ? `${form.bathrooms_count} bathroom(s)` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Notes and photos saved"}
          </p>
          {visit.status === "measurements_captured" && (
            <p className="mt-1 text-xs text-green-800">
              Visit is ready — use Mark visit done to send to sales.
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <MeasurementSection
          title="Doors"
          count={form.doors_count}
          items={form.doors}
          onCountChange={(value) => updateCount("doors_count", "doors", "Door", value)}
          onCountBlur={() => restoreCountIfEmpty("doors_count", "doors")}
          onItemChange={(index, patch) => updateItem("doors", index, patch)}
        />

        <MeasurementSection
          title="Windows"
          count={form.windows_count}
          items={form.windows}
          onCountChange={(value) =>
            updateCount("windows_count", "windows", "Window", value)
          }
          onCountBlur={() => restoreCountIfEmpty("windows_count", "windows")}
          onItemChange={(index, patch) => updateItem("windows", index, patch)}
        />

        <SpatialMeasurementSection
          title="Balconies"
          count={form.balconies_count}
          items={form.balconies}
          dealId={deal.id}
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
          dealId={deal.id}
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
              General site photos not tied to a specific balcony or bathroom.
            </p>
            <AssessmentImageUpload
              dealId={deal.id}
              images={form.additional_images}
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
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    operational_notes: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-constraints">Access & logistics</Label>
              <Textarea
                id="access-constraints"
                rows={3}
                placeholder="Parking, lift access, working hours, security clearance…"
                value={form.access_constraints}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    access_constraints: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fabrication-concerns">Fabrication concerns</Label>
              <Textarea
                id="fabrication-concerns"
                rows={3}
                placeholder="Non-standard profiles, tolerance risks, glass sizing notes…"
                value={form.fabrication_concerns}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    fabrication_concerns: e.target.value,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <Button
          onClick={() => void handleSaveAssessment()}
          disabled={saving || completing || !canSave}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save assessment
        </Button>

        <Button
          variant="outline"
          disabled={saving || completing}
          onClick={() => setConfirmCompleteOpen(true)}
        >
          {completing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Mark visit done
        </Button>
      </div>

      <AlertDialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark field visit done?</AlertDialogTitle>
            <AlertDialogDescription>
              This submits the visit for sales review and moves the deal to the next
              CRM stage. Save your site assessment first if you have not already.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={completing}
              onClick={(e) => {
                e.preventDefault();
                void handleMarkVisitDone();
              }}
            >
              {completing ? "Submitting…" : "Mark visit done"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function MeasurementSection({
  title,
  count,
  items,
  onCountChange,
  onCountBlur,
  onItemChange,
}: {
  title: string;
  count: number;
  items: SiteAssessmentMeasurementItem[];
  onCountChange: (value: string) => void;
  onCountBlur: () => void;
  onItemChange: (index: number, patch: Partial<SiteAssessmentMeasurementItem>) => void;
}) {
  const countId = `deal-${title.toLowerCase()}-count`;

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
            onChange={(e) => onCountChange(e.target.value)}
            onBlur={onCountBlur}
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
                      onChange={(e) =>
                        onItemChange(index, {
                          width_ft: parseOptionalNumber(e.target.value),
                        })
                      }
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
                      onChange={(e) =>
                        onItemChange(index, {
                          height_ft: parseOptionalNumber(e.target.value),
                        })
                      }
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
                    onChange={(e) => onItemChange(index, { notes: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a count above to add measurement fields for each{" "}
            {title.toLowerCase().slice(0, -1)}.
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
  dealId,
  onCountChange,
  onCountBlur,
  onItemChange,
  onImagesChange,
}: {
  title: string;
  count: number;
  items: SiteAssessmentSpatialItem[];
  dealId: number;
  onCountChange: (value: string) => void;
  onCountBlur: () => void;
  onItemChange: (index: number, patch: Partial<SiteAssessmentSpatialItem>) => void;
  onImagesChange: (index: number, images: SiteAssessmentImage[]) => void;
}) {
  const countId = `deal-${title.toLowerCase()}-count`;

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
            onChange={(e) => onCountChange(e.target.value)}
            onBlur={onCountBlur}
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
                          onChange={(e) =>
                            onItemChange(index, {
                              width_ft: parseOptionalNumber(e.target.value),
                            })
                          }
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
                          onChange={(e) =>
                            onItemChange(index, {
                              height_ft: parseOptionalNumber(e.target.value),
                            })
                          }
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
                              onChange={(e) => {
                                const next = [...(item.side_measurements_ft ?? [])];
                                while (next.length < sideCount) next.push(null as never);
                                next[sideIndex] = parseOptionalNumber(e.target.value);
                                onItemChange(index, { side_measurements_ft: next });
                              }}
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
                        onChange={(e) =>
                          onItemChange(index, {
                            dimensions_description: e.target.value,
                          })
                        }
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
                      onChange={(e) => onItemChange(index, { notes: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Photos</Label>
                    <AssessmentImageUpload
                      dealId={dealId}
                      images={item.images ?? []}
                      onChange={(images) => onImagesChange(index, images)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a count above to add measurement fields for each{" "}
            {title.toLowerCase().slice(0, -1)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentImageUpload({
  dealId,
  images,
  onChange,
}: {
  dealId: number;
  images: SiteAssessmentImage[];
  onChange: (images: SiteAssessmentImage[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const response = await uploadDealSiteAssessmentImage(dealId, file);
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
      await deleteDealSiteAssessmentImage(dealId, image.path);
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
                <p className="truncate text-xs text-muted-foreground">
                  {image.original_name}
                </p>
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
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
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

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
