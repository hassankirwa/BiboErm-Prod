"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  MapPin,
  Play,
  CheckCircle2,
  Loader2,
  Navigation,
} from "lucide-react";
import {
  approveSiteVisit,
  fetchTodaySiteVisits,
  startSiteVisit,
  submitSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SiteVisitsTodayPage() {
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

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

  async function runVisitAction(
    visitId: number,
    action: "start" | "submit" | "approve",
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

            return (
              <Card key={visit.id} className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{visit.title}</CardTitle>
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

                  {(status === "in_progress" ||
                    status === "measurements_captured") && (
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
                    {(status === "scheduled" ||
                      status === "assigned") && (
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
                    {(status === "in_progress" ||
                      status === "measurements_captured") && (
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

