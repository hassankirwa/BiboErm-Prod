"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Plus,
  Ruler,
  Trash2,
} from "lucide-react";
import {
  approveSiteVisit,
  fetchSiteVisit,
  startSiteVisit,
  submitSiteVisit,
  submitSiteVisitMeasurements,
  uploadSiteVisitPhoto,
  type ApiSiteVisit,
  type SiteVisitMeasurementLine,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { PermissionGate } from "@/components/auth/permission-gate";
import { toast } from "sonner";

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type MeasurementDraft = {
  room_area_name: string;
  width: string;
  height: string;
  quantity: string;
  material_preference: string;
};

const emptyMeasurementLine = (): MeasurementDraft => ({
  room_area_name: "",
  width: "",
  height: "",
  quantity: "1",
  material_preference: "",
});

function draftToPayload(lines: MeasurementDraft[]): SiteVisitMeasurementLine[] {
  return lines
    .filter((line) => line.room_area_name.trim())
    .map((line, index) => ({
      room_area_name: line.room_area_name.trim(),
      width: line.width ? Number(line.width) : undefined,
      height: line.height ? Number(line.height) : undefined,
      quantity: line.quantity ? Number(line.quantity) : 1,
      material_preference: line.material_preference || undefined,
      sort_order: index,
    }));
}

export default function SiteVisitDetailPage() {
  const params = useParams<{ id: string }>();
  const visitId = Number(params.id);
  const [visit, setVisit] = useState<ApiSiteVisit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [measurementLines, setMeasurementLines] = useState<MeasurementDraft[]>([
    emptyMeasurementLine(),
  ]);
  const [photoUploading, setPhotoUploading] = useState(false);

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
      setNotes(data.field_officer_notes ?? "");
      const existing = (
        data as ApiSiteVisit & {
          measurement_lines?: Array<{
            room_area_name: string;
            width?: number | null;
            height?: number | null;
            quantity?: number | null;
            material_preference?: string | null;
          }>;
        }
      ).measurement_lines;
      if (existing?.length) {
        setMeasurementLines(
          existing.map((line) => ({
            room_area_name: line.room_area_name,
            width: line.width != null ? String(line.width) : "",
            height: line.height != null ? String(line.height) : "",
            quantity: line.quantity != null ? String(line.quantity) : "1",
            material_preference: line.material_preference ?? "",
          })),
        );
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

  async function runAction(
    action: "start" | "measurements" | "photo" | "submit" | "approve",
    file?: File,
  ) {
    if (!visit) return;
    setActionLoading(true);
    try {
      await ensureCsrfCookie();
      let updated: ApiSiteVisit;
      if (action === "start") {
        const position = await new Promise<GeolocationPosition | null>(
          (resolve) => {
            if (!navigator.geolocation) {
              resolve(null);
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              { timeout: 8000 },
            );
          },
        );
        updated = await startSiteVisit(visit.id, {
          latitude: position?.coords.latitude,
          longitude: position?.coords.longitude,
        });
        toast.success("Visit started.");
      } else if (action === "measurements") {
        const payload = draftToPayload(measurementLines);
        if (payload.length === 0) {
          toast.error("Add at least one room/area with a name.");
          return;
        }
        updated = await submitSiteVisitMeasurements(visit.id, { lines: payload });
        toast.success("Measurements saved.");
      } else if (action === "photo") {
        if (!file) return;
        setPhotoUploading(true);
        await uploadSiteVisitPhoto(visit.id, file);
        toast.success("Photo uploaded.");
        await loadVisit();
        return;
      } else if (action === "submit") {
        updated = await submitSiteVisit(visit.id, {
          field_officer_notes: notes || undefined,
          follow_up_required: false,
        });
        toast.success("Visit submitted for review.");
      } else {
        updated = await approveSiteVisit(visit.id);
        toast.success("Visit approved.");
      }
      setVisit(updated);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Action failed.",
      );
    } finally {
      setActionLoading(false);
      setPhotoUploading(false);
    }
  }

  const status = visit?.status ?? "scheduled";
  const showFieldOps =
    status === "in_progress" || status === "measurements_captured";

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={visit?.title ?? "Site Visit"}
        subtitle={visit?.visit_number ?? (visit ? `#${visit.id}` : "")}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/site-visits">
              <ChevronLeft className="mr-1 h-4 w-4" />
              All Visits
            </Link>
          </Button>
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
                </div>
                <Badge variant="outline">{formatStatus(status)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visit.site_address && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {visit.site_address}
                </p>
              )}

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

              {visit.photos && visit.photos.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded photos</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {visit.photos.map((photo) => {
                      const src = photo.url ?? photo.firebase_url ?? undefined;
                      if (!src) return null;
                      return (
                        <a
                          key={photo.id}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-md border border-border bg-muted/30"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Site visit photo ${photo.id}`}
                            className="aspect-square w-full object-cover"
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {showFieldOps && (
                <div className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <Ruler className="h-4 w-4" />
                      Measurements
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMeasurementLines((lines) => [
                          ...lines,
                          emptyMeasurementLine(),
                        ])
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add line
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {measurementLines.map((line, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-md border border-border/60 bg-background p-3 sm:grid-cols-2"
                      >
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Room / area</Label>
                          <Input
                            value={line.room_area_name}
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
                            value={line.width}
                            onChange={(e) =>
                              setMeasurementLines((lines) =>
                                lines.map((item, i) =>
                                  i === index
                                    ? { ...item, width: e.target.value }
                                    : item,
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
                            value={line.height}
                            onChange={(e) =>
                              setMeasurementLines((lines) =>
                                lines.map((item, i) =>
                                  i === index
                                    ? { ...item, height: e.target.value }
                                    : item,
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
                            value={line.quantity}
                            onChange={(e) =>
                              setMeasurementLines((lines) =>
                                lines.map((item, i) =>
                                  i === index
                                    ? { ...item, quantity: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Material preference</Label>
                          <Input
                            value={line.material_preference}
                            onChange={(e) =>
                              setMeasurementLines((lines) =>
                                lines.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        material_preference: e.target.value,
                                      }
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
                              onClick={() =>
                                setMeasurementLines((lines) =>
                                  lines.filter((_, i) => i !== index),
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
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={() => void runAction("measurements")}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Ruler className="mr-2 h-4 w-4" />
                    )}
                    Save measurements
                  </Button>

                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <Label>Upload photo</Label>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void runAction("photo", file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              )}

              {showFieldOps && (
                <div className="space-y-2">
                  <Label htmlFor="visit-notes">Field notes</Label>
                  <Textarea
                    id="visit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Visit outcome, observations..."
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(status === "scheduled" || status === "assigned") && (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => void runAction("start")}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Start Visit
                  </Button>
                )}
                {showFieldOps && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={() => void runAction("submit")}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4" />
                    )}
                    Submit for Review
                  </Button>
                )}
                {status === "submitted_for_review" && (
                  <PermissionGate permission="site_visits.approve">
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => void runAction("approve")}
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </PermissionGate>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
