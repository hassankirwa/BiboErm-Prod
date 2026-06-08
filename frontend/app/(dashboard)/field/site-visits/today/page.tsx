"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { FieldOpenVisitCard } from "@/components/crm/field-open-visit-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeft } from "lucide-react";
import {
  fetchTodaySiteVisits,
  startSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

export default function FieldTodayVisitsPage() {
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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

  async function handleStartVisit(visitId: number) {
    setActionLoading(visitId);
    try {
      await ensureCsrfCookie();
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { timeout: 8000 },
        );
      });

      const updated = await startSiteVisit(visitId, {
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
      });
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
      toast.success("Visit started. You can now log measurements.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start visit.");
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/field/open-visits">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Open Visits
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/field">Field Home</Link>
            </Button>
          </div>
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
          visits.map((visit) => (
            <FieldOpenVisitCard
              key={visit.id}
              visit={visit}
              actionLoading={actionLoading}
              onStartVisit={(id) => void handleStartVisit(id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
