"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, Calendar } from "lucide-react";
import {
  fetchPipelineDashboard,
  type PipelineDashboardData,
} from "@/lib/api/pipeline/dashboard";

function ProductionDonut() {
  return (
    <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray="72 28"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <span className="text-xs font-bold text-foreground">72%</span>
        <span className="block text-[9px] text-muted-foreground">Capacity</span>
      </div>
    </div>
  );
}

function WidgetCardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      <Link
        href={href}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        {linkLabel}
      </Link>
    </CardHeader>
  );
}

export function WorkspaceSummaryWidgets() {
  const [pipeline, setPipeline] = useState<PipelineDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPipelineDashboard()
      .then((data) => {
        if (!cancelled) setPipeline(data);
      })
      .catch(() => {
        if (!cancelled) setPipeline(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader
          title="Pipeline Overview"
          href="/crm/leads?view=kanban"
          linkLabel="Open pipeline"
        />
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4 text-sm">
          {loading ? (
            <div className="col-span-2 flex justify-center py-6">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Open Leads</p>
                <p className="text-lg font-semibold">{pipeline?.open_leads ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Visits Today</p>
                <p className="text-lg font-semibold">
                  {pipeline?.site_visits_today ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Measurements</p>
                <p className="text-lg font-semibold">
                  {pipeline?.measurements_submitted ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Design Pending</p>
                <p className="text-lg font-semibold">
                  {pipeline?.design_jobs_pending ?? "—"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader
          title="Production Status"
          href="/production/schedule"
          linkLabel="View shop floor"
        />
        <CardContent className="flex flex-col items-start gap-4 px-4 pb-4 min-[400px]:flex-row min-[400px]:items-center">
          <ProductionDonut />
          <ul className="min-w-0 w-full space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">
                In Progress <span className="font-semibold text-foreground">(18)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                Completed <span className="font-semibold text-foreground">(26)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300" />
              <span className="text-muted-foreground">
                Planned <span className="font-semibold text-foreground">(11)</span>
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader
          title="Quotation Pipeline"
          href="/quotation/proforma"
          linkLabel="Proforma queue"
        />
        <CardContent className="space-y-3 px-4 pb-4 text-sm">
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span className="min-w-0">
                  Ready for quotation:{" "}
                  <span className="font-semibold">
                    {pipeline?.ready_for_quotation ?? 0}
                  </span>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  Proforma sent:{" "}
                  <span className="font-semibold">
                    {pipeline?.proforma_quotations_sent ?? 0}
                  </span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader title="Field" href="/site-ops/today" linkLabel="Site ops" />
        <CardContent className="space-y-3 px-4 pb-4 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span className="min-w-0">
              {loading
                ? "Loading pipeline counts…"
                : `${pipeline?.site_visits_today ?? 0} visits scheduled today`}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span className="min-w-0">
              {pipeline?.measurements_submitted ?? 0} measurement packages awaiting review
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
