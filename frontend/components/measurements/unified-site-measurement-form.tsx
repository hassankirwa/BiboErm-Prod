"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutoSketchPanel } from "@/components/measurements/auto-sketch-panel";
import { MeasurementFormHeader } from "@/components/measurements/measurement-form-header";
import { MeasurementFormSpecs } from "@/components/measurements/measurement-form-specs";
import { MeasurementLineGrid } from "@/components/measurements/measurement-line-grid";
import {
  saveSiteMeasurementForm,
  submitSiteVisit,
  uploadSiteMeasurementSketch,
  uploadSiteVisitPhoto,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import type { ApiSiteVisitPhoto } from "@/lib/api/crm/types";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ProjectDetail } from "@/lib/api/projects";
import {
  buildFormFromVisit,
  buildParentFromVisit,
  contextLabel,
  resolveMeasurementContext,
} from "@/lib/measurements/adapters";
import {
  createNextMeasurementLine,
  hasSiteMeasurementFormData,
  isMeasurementFormLocked,
  type SiteMeasurementFormData,
} from "@/lib/measurements/types";
import { canExecuteFieldVisit } from "@/lib/crm/site-visit-utils";
import { useAuth } from "@/contexts/auth-context";
import { CheckCircle2, ClipboardList, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

type UnifiedSiteMeasurementFormProps = {
  visit: ApiSiteVisit;
  project?: ProjectDetail | null;
  onVisitUpdated: (visit: ApiSiteVisit) => void;
  sectionId?: string;
};

function serializeForm(form: SiteMeasurementFormData): string {
  return JSON.stringify(form);
}

function buildPhotoUrlMap(photos?: ApiSiteVisitPhoto[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const photo of photos ?? []) {
    const url = photo.url ?? photo.firebase_url;
    if (url) map.set(photo.id, url);
  }
  return map;
}

export function UnifiedSiteMeasurementForm({
  visit,
  project,
  onVisitUpdated,
  sectionId = "log-details",
}: UnifiedSiteMeasurementFormProps) {
  const { user } = useAuth();
  const context = resolveMeasurementContext(visit);
  const parent = buildParentFromVisit(visit, project);
  const currentUserName = user?.name ?? null;
  const status = visit.status ?? "scheduled";
  const canLog = canExecuteFieldVisit(status);
  const readOnly =
    !canLog || isMeasurementFormLocked(visit.measurement_form_status ?? "draft");

  const [form, setForm] = useState<SiteMeasurementFormData>(() =>
    buildFormFromVisit(visit, parent, currentUserName),
  );
  const [photoUrls, setPhotoUrls] = useState<Map<number, string>>(() =>
    buildPhotoUrlMap(visit.photos),
  );
  const [saving, setSaving] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [completing, setCompleting] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  const formRef = useRef(form);
  const lastSavedRef = useRef(serializeForm(buildFormFromVisit(visit, parent, currentUserName)));

  formRef.current = form;

  useEffect(() => {
    const nextForm = buildFormFromVisit(visit, parent, currentUserName);
    setForm(nextForm);
    setPhotoUrls(buildPhotoUrlMap(visit.photos));
    lastSavedRef.current = serializeForm(nextForm);
  }, [visit.id, currentUserName]);

  useEffect(() => {
    setPhotoUrls((current) => {
      const merged = new Map(current);
      for (const [id, url] of buildPhotoUrlMap(visit.photos)) {
        merged.set(id, url);
      }
      return merged;
    });
  }, [visit.photos]);

  const canSave = useMemo(() => hasSiteMeasurementFormData(form), [form]);
  const isDirty = serializeForm(form) !== lastSavedRef.current;

  function updateForm(patch: Partial<SiteMeasurementFormData>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  const persistForm = useCallback(
    async (draft: boolean) => {
      await ensureCsrfCookie();
      const updated = await saveSiteMeasurementForm(visit.id, formRef.current, {
        draft,
      });
      onVisitUpdated(updated);
      lastSavedRef.current = serializeForm(formRef.current);
      setPhotoUrls(buildPhotoUrlMap(updated.photos));
      return updated;
    },
    [onVisitUpdated, visit.id],
  );

  useEffect(() => {
    if (readOnly) return;

    const timer = window.setInterval(async () => {
      if (serializeForm(formRef.current) === lastSavedRef.current) return;

      setAutosaving(true);
      try {
        await persistForm(true);
        setLastAutosavedAt(new Date());
      } catch {
        // Autosave is silent; manual save still available.
      } finally {
        setAutosaving(false);
      }
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [readOnly, persistForm]);

  async function handleSave() {
    if (!canSave) {
      toast.error("Add at least one measurement line or operational note.");
      return;
    }

    setSaving(true);
    try {
      await persistForm(false);
      toast.success("Measurements saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save measurements.");
    } finally {
      setSaving(false);
    }
  }

  const handleUploadSketch = useCallback(
    async (file: File) => {
      await ensureCsrfCookie();
      const updated = await uploadSiteMeasurementSketch(visit.id, file);
      onVisitUpdated(updated);
    },
    [onVisitUpdated, visit.id],
  );

  async function handleLinePhotoUpload(lineIndex: number, file: File) {
    await ensureCsrfCookie();
    const uploaded = await uploadSiteVisitPhoto(visit.id, file);
    if (uploaded.url) {
      setPhotoUrls((current) => new Map(current).set(uploaded.id, uploaded.url!));
    }

    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, index) =>
        index === lineIndex
          ? {
              ...line,
              photo_refs: [...(line.photo_refs ?? []), uploaded.id],
            }
          : line,
      ),
    }));
  }

  function handleLinePhotoRemove(lineIndex: number, photoId: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, index) =>
        index === lineIndex
          ? {
              ...line,
              photo_refs: (line.photo_refs ?? []).filter((id) => id !== photoId),
            }
          : line,
      ),
    }));
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await ensureCsrfCookie();
      const updated = await submitSiteVisit(visit.id, {
        field_officer_notes: form.operational_notes ?? undefined,
      });
      onVisitUpdated(updated);
      toast.success("Visit submitted for review.");
      setConfirmCompleteOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit visit.");
    } finally {
      setCompleting(false);
    }
  }

  function addLine() {
    updateForm({
      lines: [...form.lines, createNextMeasurementLine(form.lines)],
    });
  }

  return (
    <Card id={sectionId} className="border-border scroll-mt-24">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Final site measurement form
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {contextLabel(context)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {readOnly && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                Read-only
              </span>
            )}
            {!readOnly && (
              <>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add line
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !canSave}
                  >
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {autosaving ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Autosaving…
                    </span>
                  ) : isDirty ? (
                    "Unsaved changes · autosaves every 10s"
                  ) : lastAutosavedAt ? (
                    `Saved ${lastAutosavedAt.toLocaleTimeString()}`
                  ) : (
                    "Autosaves every 10s"
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Project / client information</h3>
          <MeasurementFormHeader
            form={form}
            readOnly={readOnly}
            onChange={updateForm}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Technical specifications</h3>
          <MeasurementFormSpecs form={form} readOnly={readOnly} onChange={updateForm} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Measurement lines</h3>
          <MeasurementLineGrid
            lines={form.lines}
            readOnly={readOnly}
            photoUrls={photoUrls}
            onChange={(lines) => updateForm({ lines })}
            onLinePhotoUpload={handleLinePhotoUpload}
            onLinePhotoRemove={handleLinePhotoRemove}
          />
        </section>

        <section id="measurement-sketch" className="scroll-mt-24 space-y-3">
          <h3 className="text-sm font-semibold">System sketch</h3>
          <AutoSketchPanel
            lines={form.lines}
            context={context}
            sketchUrl={visit.rough_sketch_url}
            readOnly={readOnly}
            onUpload={handleUploadSketch}
          />
        </section>

        <section className="space-y-2">
          <Label htmlFor="operational_notes">Operational notes</Label>
          {readOnly ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {form.operational_notes || "—"}
            </p>
          ) : (
            <Textarea
              id="operational_notes"
              rows={3}
              value={form.operational_notes ?? ""}
              onChange={(event) => updateForm({ operational_notes: event.target.value })}
            />
          )}
        </section>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={saving || !canSave}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save measurements
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={completing || visit.status !== "measurements_captured"}
              onClick={() => setConfirmCompleteOpen(true)}
            >
              {completing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              )}
              Mark visit done
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit visit for review?</AlertDialogTitle>
            <AlertDialogDescription>
              After submission the measurement form becomes read-only until a reviewer
              approves or rejects the visit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={completing}>
              Submit visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
