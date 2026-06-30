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
import {
  canUploadDesignJob,
  designJobStatusLabel,
  fetchDesignJobs,
  type ApiDesignJob,
} from "@/lib/api/design/jobs";
import { ApiError } from "@/lib/api/errors";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const uploadStatuses = ["wincad_in_progress", "package_downloaded", "assigned"];

export default function DesignUploadsPage() {
  const [jobs, setJobs] = useState<ApiDesignJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const batches = await Promise.all(
          uploadStatuses.map((status) =>
            fetchDesignJobs({ status, per_page: 25 }).then((res) => res.data),
          ),
        );
        const merged = batches.flat();
        const unique = Array.from(new Map(merged.map((job) => [job.id, job])).values());
        setJobs(unique);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load upload queue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="WINCAD Uploads"
        subtitle="Upload and validate WINCAD design output files."
      />
      <div className="space-y-6 p-6">
        <Card className="rounded-[10px]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : jobs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No design jobs are awaiting WINCAD uploads.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        {job.design_job_number ?? `#${job.id}`}
                      </TableCell>
                      <TableCell>
                        {job.lead_id ? `Lead #${job.lead_id}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {designJobStatusLabel(job.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.files_count ?? 0}</TableCell>
                      <TableCell className="text-right">
                        {canUploadDesignJob(job) ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/design/jobs/${job.id}?action=upload`}>
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                              Upload
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Approved</span>
                        )}
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
