"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SiteVisitStatusBadge } from "@/components/crm/site-visit-status-badge";
import {
  fetchAssignedSiteVisitHistory,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ApiError } from "@/lib/api/errors";
import {
  siteVisitDetailPath,
  type SiteVisitWorkspace,
} from "@/lib/crm/site-visit-paths";
import { Calendar, MessageSquareText } from "lucide-react";

export function SiteVisitHistoryView({
  workspace = "user",
}: {
  workspace?: SiteVisitWorkspace;
}) {
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAssignedSiteVisitHistory({ per_page: 50 });
      setVisits(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load site visit history.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Site visit history
        </h2>
        <p className="text-sm text-muted-foreground">
          Review submitted, approved, correction, revisit, and cancelled visits
          assigned to you.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
          {error}
        </div>
      ) : visits.length === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          No reviewed or completed visits yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{visit.title}</CardTitle>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{visit.visit_number ?? `#${visit.id}`}</span>
                      {visit.visit_date ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(visit.visit_date).toLocaleDateString()}
                        </span>
                      ) : null}
                      <span className="capitalize">
                        {visit.measurement_context ?? "quotation"} measurement
                      </span>
                    </p>
                  </div>
                  <SiteVisitStatusBadge status={visit.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visit.review_notes ? (
                  <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Review notes</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {visit.review_notes}
                      </p>
                      <p className="mt-1 text-xs">
                        {visit.reviewer?.name
                          ? `By ${visit.reviewer.name}`
                          : "Reviewer"}
                        {visit.reviewed_at
                          ? ` · ${new Date(visit.reviewed_at).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ) : visit.status === "approved" ? (
                  <p className="text-sm text-muted-foreground">
                    Approved
                    {visit.approved_at
                      ? ` on ${new Date(visit.approved_at).toLocaleString()}`
                      : ""}
                    .
                  </p>
                ) : null}

                <Button size="sm" variant="outline" asChild>
                  <Link href={siteVisitDetailPath(visit.id, workspace)}>
                    View visit
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
