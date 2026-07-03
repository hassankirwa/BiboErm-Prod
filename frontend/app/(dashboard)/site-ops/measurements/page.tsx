"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchSiteOpsVisits } from "@/lib/api/site-ops/visits";
import type { ApiSiteOpsVisit } from "@/lib/api/site-ops/visits";
import { ApiError } from "@/lib/api/errors";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import type { SiteOpsMeasurementContext } from "@/lib/site-ops/paths";
import { SITE_OPS_CONTEXT_META } from "@/lib/site-ops/paths";

function formatStatus(status: string | null): string {
  if (!status) return "—";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type SiteOpsReviewQueuePageViewProps = {
  measurementContext?: SiteOpsMeasurementContext;
  title?: string;
  subtitle?: string;
};

export function SiteOpsReviewQueuePageView({
  measurementContext = "quotation",
  title,
  subtitle,
}: SiteOpsReviewQueuePageViewProps) {
  const contextMeta = SITE_OPS_CONTEXT_META[measurementContext];
  const [visits, setVisits] = useState<ApiSiteOpsVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchSiteOpsVisits({
          status: "submitted_for_review",
          measurement_context: measurementContext,
          per_page: 50,
        });
        setVisits(res.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to load submitted visits.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [measurementContext]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={title ?? contextMeta.reviewTitle}
        subtitle={subtitle ?? contextMeta.reviewSubtitle}
      />
      <div className="space-y-6 p-6">
        <Card className="rounded-[10px]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : visits.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No visits are waiting for measurement review.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-medium">
                        {visit.title ?? visit.visit_number ?? `#${visit.id}`}
                      </TableCell>
                      <TableCell>
                        {visit.lead?.name ?? visit.lead?.reference ?? "—"}
                      </TableCell>
                      <TableCell>{visit.visit_date ?? "—"}</TableCell>
                      <TableCell>
                        {visit.assigned_field_officer?.name ??
                          visit.assigned_to_user?.name ??
                          "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatStatus(visit.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/site-ops/visits/${visit.id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SiteOpsMeasurementsPage() {
  return <SiteOpsReviewQueuePageView measurementContext="quotation" />;
}
