"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QCStats } from "@/components/qc/qc-stats";
import type { QcDashboardSummary } from "@/lib/api/qc";
import { QC_CONTEXT_LABELS } from "@/lib/api/qc";

type QcDashboardPanelProps = {
  summary: QcDashboardSummary | null;
  loading?: boolean;
};

export function QcDashboardPanel({ summary, loading }: QcDashboardPanelProps) {
  const rawOpenDefects = summary?.open_defects;
  const openDefects = Array.isArray(rawOpenDefects)
    ? rawOpenDefects
    : Array.isArray((rawOpenDefects as { data?: unknown })?.data)
      ? ((rawOpenDefects as { data: typeof summary.open_defects }).data ?? [])
      : [];
  const rawDueSchedules = summary?.due_schedules;
  const dueSchedules = Array.isArray(rawDueSchedules)
    ? rawDueSchedules
    : Array.isArray((rawDueSchedules as { data?: unknown })?.data)
      ? ((rawDueSchedules as { data: typeof summary.due_schedules }).data ?? [])
      : [];
  const trend = summary?.fail_rate_trend ?? [];

  return (
    <div className="space-y-6">
      <QCStats summary={summary} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Open defects</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/qc/defects">View all defects</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : openDefects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open defects.</p>
            ) : (
              <ul className="divide-y">
                {openDefects.map((defect) => (
                  <li key={defect.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <Link
                        href={`/qc/inspections/${defect.inspection_id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {defect.description}
                      </Link>
                      <p className="text-muted-foreground">
                        {defect.inspection?.reference ?? `Inspection #${defect.inspection_id}`} ·{" "}
                        {defect.severity}
                      </p>
                    </div>
                    <Badge variant="outline">{defect.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Due schedules</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/qc/schedules">Manage schedules</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : dueSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schedules due soon.</p>
            ) : (
              <ul className="divide-y">
                {dueSchedules.map((schedule) => (
                  <li key={schedule.id} className="py-3 text-sm">
                    <p className="font-medium">{schedule.name}</p>
                    <p className="text-muted-foreground">
                      {QC_CONTEXT_LABELS[schedule.context]} · due{" "}
                      {new Date(schedule.next_due_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fail rate trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-4 text-sm">
              {trend.map((point) => (
                <li key={point.period} className="rounded-md border px-3 py-2">
                  <span className="text-muted-foreground">{point.period}</span>
                  <span className="ml-2 font-medium">{point.fail_rate.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
