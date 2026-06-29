"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { PipelineDashboardData } from "@/lib/api/pipeline/dashboard";
import { cn } from "@/lib/utils";

const pipelineLinks: Array<{
  key: keyof PipelineDashboardData;
  label: string;
  href: string;
}> = [
  { key: "open_leads", label: "Open leads", href: "/crm/leads?view=kanban" },
  { key: "site_visits_today", label: "Site visits today", href: "/site-ops/today" },
  {
    key: "measurements_submitted",
    label: "Measurements submitted",
    href: "/site-ops/measurements",
  },
  { key: "design_jobs_pending", label: "Design jobs pending", href: "/design/jobs" },
  {
    key: "ready_for_quotation",
    label: "Ready for quotation",
    href: "/quotation/requests",
  },
  {
    key: "proforma_quotations_sent",
    label: "Proforma sent",
    href: "/quotation/proforma",
  },
  { key: "awaiting_deposit", label: "Awaiting deposit", href: "/crm/deals" },
  { key: "open_deals", label: "Open deals", href: "/crm/deals" },
];

function formatPipelineValue(value: number): string {
  if (value >= 1_000_000) {
    return `KES ${(value / 1_000_000).toFixed(2)}M`;
  }
  return `KES ${value.toLocaleString("en-KE")}`;
}

export function CrmPipelineCards({
  data,
  loading,
  compact = false,
}: {
  data: PipelineDashboardData | null;
  loading?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className="min-w-0 rounded-[10px] border-border/70 bg-card shadow-sm">
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-[#1e3a5f]">
          Modular lifecycle pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "grid gap-2",
                compact
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-2 md:grid-cols-4",
              )}
            >
              {pipelineLinks.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="rounded-[10px] border border-border/60 bg-muted/20 px-3 py-2 transition-colors hover:bg-[#ebf2ff]/40"
                >
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {data ? String(data[item.key]) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Pipeline value:{" "}
              <span className="font-semibold text-foreground">
                {data ? formatPipelineValue(data.pipeline_value) : "—"}
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
