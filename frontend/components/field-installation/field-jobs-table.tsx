"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  listFieldJobs,
  type FieldInstallationJob,
} from "@/lib/api/field-installation";

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
  const [jobs, setJobs] = useState<FieldInstallationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFieldJobs({ per_page: 50 })
      .then((res) => setJobs(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Loading field jobs…</p>
    );
  }

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  if (jobs.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No field installation jobs yet.
      </p>
    );
  }

  return (
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
  );
}
