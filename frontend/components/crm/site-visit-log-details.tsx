"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Ruler,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  submitSiteVisit,
  submitSiteVisitMeasurements,
  uploadSiteVisitPhoto,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  canExecuteFieldVisit,
  draftsToMeasurementPayload,
  emptyMeasurementLine,
  measurementLinesToDrafts,
  type MeasurementDraft,
} from "@/lib/crm/site-visit-utils";

type SiteVisitLogDetailsProps = {
  visit: ApiSiteVisit;
  onVisitUpdated: (visit: ApiSiteVisit) => void;
  onRefresh?: () => Promise<void>;
  sectionId?: string;
};

export function SiteVisitLogDetails({
  visit,
  onVisitUpdated,
  onRefresh,
  sectionId = "log-details",
}: SiteVisitLogDetailsProps) {
  const status = visit.status ?? "scheduled";
  const canLog = canExecuteFieldVisit(status);

  const [measurementLines, setMeasurementLines] = useState<MeasurementDraft[]>(
    () => measurementLinesToDrafts(visit.measurement_lines),
  );
  const [notes, setNotes] = useState(visit.field_officer_notes ?? "");
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  useEffect(() => {
    setMeasurementLines(measurementLinesToDrafts(visit.measurement_lines));
    setNotes(visit.field_officer_notes ?? "");
  }, [visit.id, visit.measurement_lines, visit.field_officer_notes]);

  async function handleSaveMeasurements() {
    const payload = draftsToMeasurementPayload(measurementLines);
    if (payload.length === 0) {
      toast.error("Add at least one room or area with a name.");
      return;
    }

    setSavingMeasurements(true);
    try {
      await ensureCsrfCookie();
      const updated = await submitSiteVisitMeasurements(visit.id, {
        lines: payload,
      });
      onVisitUpdated(updated);
      toast.success("Measurements saved.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to save measurements.",
      );
    } finally {
      setSavingMeasurements(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    setPhotoUploading(true);
    try {
      await ensureCsrfCookie();
      await uploadSiteVisitPhoto(visit.id, file);
      toast.success("Photo uploaded.");
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to upload photo.",
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleMarkVisitDone() {
    setCompleting(true);
    try {
      await ensureCsrfCookie();
      const updated = await submitSiteVisit(visit.id, {
        field_officer_notes: notes.trim() || undefined,
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

  if (!canLog) {
    return null;
  }

  const busy = savingMeasurements || completing || photoUploading;

  return (
    <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
      <section
        id={sectionId}
        className="scroll-mt-24 space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-[#1e3a5f]">
              <ClipboardList className="h-5 w-5" />
              Log details
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture room measurements, site photos, and notes before marking the
              visit done.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="h-4 w-4" />
              Measurements
            </h4>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                setMeasurementLines((lines) => [...lines, emptyMeasurementLine()])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          {measurementLines.map((line, index) => (
            <div
              key={`${visit.id}-line-${index}`}
              className="grid gap-2 rounded-md border border-border/60 bg-background p-3 sm:grid-cols-2"
            >
              <div className="space-y-1 sm:col-span-2">
                <Label>Room / area</Label>
                <Input
                  value={line.room_area_name}
                  disabled={busy}
                  placeholder="Living room"
                  onChange={(e) =>
                    setMeasurementLines((lines) =>
                      lines.map((item, i) =>
                        i === index
                          ? { ...item, room_area_name: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Width (m)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={busy}
                  value={line.width}
                  onChange={(e) =>
                    setMeasurementLines((lines) =>
                      lines.map((item, i) =>
                        i === index ? { ...item, width: e.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Height (m)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={busy}
                  value={line.height}
                  onChange={(e) =>
                    setMeasurementLines((lines) =>
                      lines.map((item, i) =>
                        i === index ? { ...item, height: e.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  disabled={busy}
                  value={line.quantity}
                  onChange={(e) =>
                    setMeasurementLines((lines) =>
                      lines.map((item, i) =>
                        i === index ? { ...item, quantity: e.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Material preference</Label>
                <Input
                  disabled={busy}
                  value={line.material_preference}
                  onChange={(e) =>
                    setMeasurementLines((lines) =>
                      lines.map((item, i) =>
                        i === index
                          ? { ...item, material_preference: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  disabled={busy}
                  value={line.installation_notes}
                  placeholder="Obstacles, installation notes..."
                  rows={2}
                  onChange={(e) =>
                    setMeasurementLines((lines) =>
                      lines.map((item, i) =>
                        i === index
                          ? { ...item, installation_notes: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              {measurementLines.length > 1 && (
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() =>
                      setMeasurementLines((lines) =>
                        lines.length > 1
                          ? lines.filter((_, i) => i !== index)
                          : lines,
                      )
                    }
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleSaveMeasurements()}
          >
            {savingMeasurements ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ruler className="mr-2 h-4 w-4" />
            )}
            Save measurements
          </Button>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label>Site photos</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePhotoUpload(file);
              e.target.value = "";
            }}
          />
          {photoUploading && (
            <p className="text-xs text-muted-foreground">Uploading photo...</p>
          )}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor={`field-notes-${visit.id}`}>Field officer notes</Label>
          <Textarea
            id={`field-notes-${visit.id}`}
            disabled={busy}
            value={notes}
            placeholder="Visit outcome, client comments, follow-up items..."
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button
            size="default"
            className="min-w-[160px]"
            disabled={busy}
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
                This submits the visit for sales review and moves the linked lead
                or deal to the next CRM stage. Save your measurements first if
                you have not already.
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
                {completing ? "Submitting..." : "Mark visit done"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </PermissionGate>
  );
}
