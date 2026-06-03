"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  completeFieldJob,
  getFieldJob,
  listDailyLogs,
  listDeliveries,
  listNonConformities,
  recordDelivery,
  reportNonConformity,
  startFieldJob,
  submitDailyLog,
  updateUnit,
  type FieldDailyLog,
  type FieldDeliveryRecord,
  type FieldInstallationJob,
  type FieldNonConformity,
} from "@/lib/api/field-installation";

type Props = { jobId: number };

export function FieldJobDetail({ jobId }: Props) {
  const [job, setJob] = useState<FieldInstallationJob | null>(null);
  const [logs, setLogs] = useState<FieldDailyLog[]>([]);
  const [deliveries, setDeliveries] = useState<FieldDeliveryRecord[]>([]);
  const [ncs, setNcs] = useState<FieldNonConformity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logSummary, setLogSummary] = useState("");
  const [ncTitle, setNcTitle] = useState("");
  const [ncDescription, setNcDescription] = useState("");

  const reload = useCallback(async () => {
    const [jobRes, logsRes, delRes, ncRes] = await Promise.all([
      getFieldJob(jobId),
      listDailyLogs(jobId),
      listDeliveries(jobId),
      listNonConformities(jobId),
    ]);
    setJob(jobRes.data);
    setLogs(logsRes.data);
    setDeliveries(delRes.data);
    setNcs(ncRes.data);
  }, [jobId]);

  useEffect(() => {
    reload()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading job…</p>;
  }

  if (error || !job) {
    return (
      <p className="p-6 text-sm text-destructive">{error ?? "Job not found."}</p>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{job.status.replace(/_/g, " ")}</Badge>
        <span className="text-sm text-muted-foreground">
          {job.percent_complete}% complete
        </span>
        {job.status === "scheduled" && (
          <Button size="sm" onClick={() => runAction(() => startFieldJob(jobId))}>
            Start job
          </Button>
        )}
        {job.status === "in_progress" && (
          <Button size="sm" onClick={() => runAction(() => completeFieldJob(jobId))}>
            Complete job
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={`/field-installation/jobs/${jobId}/daily-log`}>
            Daily log form
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{job.site_address ?? job.project?.name ?? "—"}</p>
          {job.site_contact_name && (
            <p>
              {job.site_contact_name} · {job.site_contact_phone}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(job.units ?? []).map((unit) => (
            <div
              key={unit.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <span>{unit.unit_label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{unit.status}</Badge>
                {unit.status !== "installed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      runAction(() =>
                        updateUnit(unit.id, { status: "installed" }),
                      )
                    }
                  >
                    Mark installed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="log_date">Date</Label>
              <Input
                id="log_date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={logSummary}
                onChange={(e) => setLogSummary(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={!logSummary.trim()}
            onClick={() =>
              runAction(() =>
                submitDailyLog(jobId, {
                  log_date: logDate,
                  summary: logSummary,
                }),
              )
            }
          >
            Submit log
          </Button>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {logs.map((log) => (
              <li key={log.id}>
                {log.log_date}: {log.summary}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {job.job_type === "outside_full_install" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              onClick={() =>
                runAction(() =>
                  recordDelivery(jobId, {
                    delivery_condition: "complete",
                    lines: [
                      {
                        description: "Shipment received",
                        qty_expected: 1,
                        qty_received: 1,
                      },
                    ],
                  }),
                )
              }
            >
              Record delivery (complete)
            </Button>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {deliveries.map((d) => (
                <li key={d.id}>
                  {d.received_at}: {d.delivery_condition}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Non-conformities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title"
            value={ncTitle}
            onChange={(e) => setNcTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description"
            value={ncDescription}
            onChange={(e) => setNcDescription(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!ncTitle.trim() || !ncDescription.trim()}
            onClick={() =>
              runAction(() =>
                reportNonConformity(jobId, {
                  nc_type: "other",
                  severity: "minor",
                  title: ncTitle,
                  description: ncDescription,
                }),
              )
            }
          >
            Report NC
          </Button>
          <ul className="space-y-1 text-sm">
            {ncs.map((nc) => (
              <li key={nc.id}>
                <span className="font-medium">{nc.title}</span> — {nc.severity}{" "}
                ({nc.status})
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
