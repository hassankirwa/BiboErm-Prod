"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createFieldJob,
  listFieldJobs,
  type FieldInstallationJob,
} from "@/lib/api/field-installation";
import { listProjects, projectLabel, type ProjectSummary } from "@/lib/api/projects";

const statusColors: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-info/10 text-info",
  on_hold: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function FieldJobsTable() {
  const router = useRouter();
  const [jobs, setJobs] = useState<FieldInstallationJob[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    const [jobsRes, projectsRes] = await Promise.all([
      listFieldJobs({ per_page: 50 }),
      listProjects({ per_page: 50 }),
    ]);
    setJobs(jobsRes.data);
    setProjects(projectsRes.data);
  }, []);

  useEffect(() => {
    refresh()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate() {
    if (!projectId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await createFieldJob({
        project_id: Number(projectId),
        scheduled_start: scheduledStart || undefined,
        site_address: siteAddress || undefined,
        notes: notes || undefined,
      });
      setProjectId("");
      setScheduledStart("");
      setSiteAddress("");
      setNotes("");
      await refresh();
      router.push(`/field-installation/jobs/${res.data.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create job.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Loading field jobs…</p>
    );
  }

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create field job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="project_id">Project</Label>
              {projects.length > 0 ? (
                <select
                  id="project_id"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {projectLabel(p)}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="project_id"
                  type="number"
                  placeholder="Project ID"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              )}
            </div>
            <div>
              <Label htmlFor="scheduled_start">Scheduled start</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="site_address">Site address</Label>
              <Input
                id="site_address"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[36px]"
              />
            </div>
          </div>
          <Button size="sm" disabled={!projectId || creating} onClick={() => void handleCreate()}>
            {creating ? "Creating…" : "Create job"}
          </Button>
        </CardContent>
      </Card>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No field installation jobs yet. Use the form above to create one.
        </p>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Reference</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link
                      href={`/field-installation/jobs/${job.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {job.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {job.project?.name ?? `Project #${job.project_id}`}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {job.job_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{job.percent_complete}%</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[job.status] ?? ""}
                    >
                      {formatStatus(job.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
