"use client";

import Link from "next/link";
import { Calendar, FileSpreadsheet, Layers, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiLeadDetail } from "@/lib/api/crm/types";
import { quotationDetailPath } from "@/lib/quotations/paths";
import { cn } from "@/lib/utils";

type LeadRelatedRecordsProps = {
  lead: ApiLeadDetail;
  designJobsCount?: number;
  className?: string;
};

function RecordRow({
  icon: Icon,
  label,
  count,
  href,
  meta,
}: {
  icon: typeof Calendar;
  label: string;
  count: number;
  href?: string;
  meta?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-[10px] border border-border/60 bg-card px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#ebf2ff] text-[#1e3a5f]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[#1e3a5f]">{label}</p>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {count}
          </Badge>
        </div>
        {meta ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
        ) : null}
      </div>
    </div>
  );

  if (href && count > 0) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}

export function LeadRelatedRecords({
  lead,
  designJobsCount = 0,
  className,
}: LeadRelatedRecordsProps) {
  const siteVisits = lead.site_visits ?? [];
  const siteVisitCount = siteVisits.length;
  const latestVisit = siteVisits[0];
  const proforma = lead.latest_quotation;
  const proformaMeta = proforma
    ? `${proforma.quotation_number ?? "Proforma"} · ${(proforma.status ?? "draft").replace(/_/g, " ")}`
    : undefined;

  return (
    <Card className={cn("rounded-[10px] border-border/70 shadow-sm", className)}>
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-[#1e3a5f]">
          Related records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        <RecordRow
          icon={Calendar}
          label="Site visits"
          count={siteVisitCount}
          href={
            siteVisitCount > 0 && latestVisit
              ? `/site-ops/visits/${latestVisit.id}`
              : "/site-ops/visits"
          }
          meta={
            latestVisit
              ? `${latestVisit.title ?? "Visit"} · ${(latestVisit.status ?? "scheduled").replace(/_/g, " ")}`
              : "No visits scheduled yet"
          }
        />
        <RecordRow
          icon={Layers}
          label="Design jobs"
          count={designJobsCount}
          href={designJobsCount > 0 ? `/design/jobs?lead_id=${lead.id}` : "/design/jobs"}
          meta={
            designJobsCount > 0
              ? "WINCAD design work linked to this lead"
              : "Design starts after measurements are approved"
          }
        />
        <RecordRow
          icon={FileSpreadsheet}
          label="Proforma quotation"
          count={proforma ? 1 : 0}
          href={
            proforma
              ? quotationDetailPath(proforma.id)
              : "/quotation/proforma"
          }
          meta={proformaMeta ?? "No proforma created yet"}
        />
        {lead.need_site_visit ? (
          <div className="flex items-center gap-2 rounded-[10px] bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Ruler className="h-3.5 w-3.5 shrink-0" />
            Site measurements required for this opportunity
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
