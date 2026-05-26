"use client";



import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { AppHeader } from "@/components/app-header";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Spinner } from "@/components/ui/spinner";

import { Textarea } from "@/components/ui/textarea";

import {

  ChevronLeft,

  MapPin,

  Play,

  CheckCircle2,

  Loader2,

  Navigation,

  Plus,

  Ruler,

  Trash2,

} from "lucide-react";

import {

  approveSiteVisit,

  fetchTodaySiteVisits,

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



export default function SiteVisitsTodayPage() {

  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [notes, setNotes] = useState<Record<number, string>>({});

  const [measurementDrafts, setMeasurementDrafts] = useState<

    Record<number, MeasurementDraft[]>

  >({});

  const [photoUploading, setPhotoUploading] = useState<number | null>(null);



  const loadVisits = useCallback(async () => {

    setIsLoading(true);

    setError(null);

    try {

      const res = await fetchTodaySiteVisits();

      setVisits(res.data);

    } catch (err) {

      setError(

        err instanceof ApiError ? err.message : "Failed to load today's visits.",

      );

    } finally {

      setIsLoading(false);

    }

  }, []);



  useEffect(() => {

    loadVisits();

  }, [loadVisits]);



  function getMeasurementDrafts(visitId: number): MeasurementDraft[] {

    return measurementDrafts[visitId] ?? [emptyMeasurementLine()];

  }



  function updateMeasurementDraft(

    visitId: number,

    index: number,

    patch: Partial<MeasurementDraft>,

  ) {

    setMeasurementDrafts((prev) => {

      const lines = [...(prev[visitId] ?? [emptyMeasurementLine()])];

      lines[index] = { ...lines[index], ...patch };

      return { ...prev, [visitId]: lines };

    });

  }



  function addMeasurementLine(visitId: number) {

    setMeasurementDrafts((prev) => ({

      ...prev,

      [visitId]: [...getMeasurementDrafts(visitId), emptyMeasurementLine()],

    }));

  }



  function removeMeasurementLine(visitId: number, index: number) {

    setMeasurementDrafts((prev) => {

      const lines = getMeasurementDrafts(visitId).filter((_, i) => i !== index);

      return {

        ...prev,

        [visitId]: lines.length > 0 ? lines : [emptyMeasurementLine()],

      };

    });

  }



  async function runVisitAction(

    visitId: number,

    action: "start" | "submit" | "approve" | "measurements" | "photo",

    file?: File,

  ) {

    setActionLoading(visitId);

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

        updated = await startSiteVisit(visitId, {

          latitude: position?.coords.latitude,

          longitude: position?.coords.longitude,

        });

        toast.success("Visit started.");

      } else if (action === "measurements") {

        const payload = draftToPayload(getMeasurementDrafts(visitId));

        if (payload.length === 0) {

          toast.error("Add at least one room/area with a name.");

          return;

        }

        updated = await submitSiteVisitMeasurements(visitId, { lines: payload });

        toast.success("Measurements saved.");

      } else if (action === "photo") {

        if (!file) return;

        setPhotoUploading(visitId);

        await uploadSiteVisitPhoto(visitId, file);

        toast.success("Photo uploaded.");

        setPhotoUploading(null);

        return;

      } else if (action === "submit") {

        updated = await submitSiteVisit(visitId, {

          field_officer_notes: notes[visitId] || undefined,

          follow_up_required: false,

        });

        toast.success("Visit submitted for review.");

      } else {

        updated = await approveSiteVisit(visitId);

        toast.success("Visit approved.");

      }

      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));

    } catch (err) {

      toast.error(

        err instanceof ApiError ? err.message : "Action failed.",

      );

    } finally {

      setActionLoading(null);

      setPhotoUploading(null);

    }

  }



  return (

    <div className="flex h-full flex-col">

      <AppHeader

        title="Today's Visits"

        subtitle={new Date().toLocaleDateString(undefined, {

          weekday: "long",

          year: "numeric",

          month: "long",

          day: "numeric",

        })}

        actions={

          <Button variant="outline" size="sm" asChild>

            <Link href="/crm/site-visits">

              <ChevronLeft className="mr-1 h-4 w-4" />

              All Visits

            </Link>

          </Button>

        }

      />



      <div className="flex-1 space-y-4 overflow-auto p-6">

        {isLoading ? (

          <div className="flex justify-center py-16">

            <Spinner className="h-8 w-8 text-primary" />

          </div>

        ) : error ? (

          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">

            {error}

          </div>

        ) : visits.length === 0 ? (

          <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">

            No visits assigned for today.

          </div>

        ) : (

          visits.map((visit) => {

            const status = visit.status ?? "scheduled";

            const busy = actionLoading === visit.id;

            const showFieldOps =

              status === "in_progress" || status === "measurements_captured";

            const lines = getMeasurementDrafts(visit.id);



            return (

              <Card key={visit.id} className="border-border">

                <CardHeader className="pb-2">

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <CardTitle className="text-base">

                        <Link

                          href={`/crm/site-visits/${visit.id}`}

                          className="hover:underline"

                        >

                          {visit.title}

                        </Link>

                      </CardTitle>

                      <p className="text-xs text-muted-foreground mt-1">

                        {visit.visit_number ?? `#${visit.id}`}

                        {visit.visit_time ? ` · ${visit.visit_time}` : ""}

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



                  {visit.notes_for_field_officer && (

                    <p className="text-sm text-muted-foreground">

                      {visit.notes_for_field_officer}

                    </p>

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

                          onClick={() => addMeasurementLine(visit.id)}

                        >

                          <Plus className="mr-1 h-3.5 w-3.5" />

                          Add line

                        </Button>

                      </div>

                      <div className="space-y-3">

                        {lines.map((line, index) => (

                          <div

                            key={`${visit.id}-${index}`}

                            className="grid gap-2 rounded-md border border-border/60 bg-background p-3 sm:grid-cols-2"

                          >

                            <div className="space-y-1 sm:col-span-2">

                              <Label>Room / area</Label>

                              <Input

                                value={line.room_area_name}

                                onChange={(e) =>

                                  updateMeasurementDraft(visit.id, index, {

                                    room_area_name: e.target.value,

                                  })

                                }

                                placeholder="Living room"

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

                                  updateMeasurementDraft(visit.id, index, {

                                    width: e.target.value,

                                  })

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

                                  updateMeasurementDraft(visit.id, index, {

                                    height: e.target.value,

                                  })

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

                                  updateMeasurementDraft(visit.id, index, {

                                    quantity: e.target.value,

                                  })

                                }

                              />

                            </div>

                            <div className="space-y-1">

                              <Label>Material preference</Label>

                              <Input

                                value={line.material_preference}

                                onChange={(e) =>

                                  updateMeasurementDraft(visit.id, index, {

                                    material_preference: e.target.value,

                                  })

                                }

                              />

                            </div>

                            {lines.length > 1 && (

                              <div className="sm:col-span-2">

                                <Button

                                  type="button"

                                  size="sm"

                                  variant="ghost"

                                  className="text-destructive"

                                  onClick={() =>

                                    removeMeasurementLine(visit.id, index)

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

                        disabled={busy}

                        onClick={() => runVisitAction(visit.id, "measurements")}

                      >

                        {busy ? (

                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                        ) : (

                          <Ruler className="mr-2 h-4 w-4" />

                        )}

                        Save measurements

                      </Button>



                      <div className="space-y-2 border-t border-border/60 pt-4">

                        <Label>Site photos</Label>

                        <Input

                          type="file"

                          accept="image/jpeg,image/png,image/webp"

                          disabled={photoUploading === visit.id}

                          onChange={(e) => {

                            const file = e.target.files?.[0];

                            if (file) {

                              void runVisitAction(visit.id, "photo", file);

                            }

                            e.target.value = "";

                          }}

                        />

                        {photoUploading === visit.id && (

                          <p className="text-xs text-muted-foreground">

                            Uploading photo...

                          </p>

                        )}

                      </div>

                    </div>

                  )}



                  {showFieldOps && (

                    <div className="space-y-2">

                      <Label htmlFor={`notes-${visit.id}`}>Field notes</Label>

                      <Textarea

                        id={`notes-${visit.id}`}

                        value={notes[visit.id] ?? ""}

                        onChange={(e) =>

                          setNotes((n) => ({

                            ...n,

                            [visit.id]: e.target.value,

                          }))

                        }

                        placeholder="Visit outcome, observations..."

                      />

                    </div>

                  )}



                  <div className="flex flex-wrap gap-2">

                    {(status === "scheduled" || status === "assigned") && (

                      <Button

                        size="sm"

                        disabled={busy}

                        onClick={() => runVisitAction(visit.id, "start")}

                      >

                        {busy ? (

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

                        disabled={busy}

                        onClick={() => runVisitAction(visit.id, "submit")}

                      >

                        {busy ? (

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

                          disabled={busy}

                          onClick={() => runVisitAction(visit.id, "approve")}

                        >

                          {busy ? (

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

            );

          })

        )}

      </div>

    </div>

  );

}


