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
  designJobStatusLabel,
  fetchDesignJobs,
  type ApiDesignJob,
} from "@/lib/api/design/jobs";
import { ApiError } from "@/lib/api/errors";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const reviewStatuses = ["files_uploaded", "design_review", "wincad_uploaded"];

export default function DesignReviewPage() {
  const [jobs, setJobs] = useState<ApiDesignJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const batches = await Promise.all(
          reviewStatuses.map((status) =>
            fetchDesignJobs({ status, per_page: 25 }).then((res) => res.data),
          ),
        );
        const merged = batches.flat();
        const unique = Array.from(new Map(merged.map((job) => [job.id, job])).values());
        setJobs(unique);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load review queue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Design Review"
        subtitle="Review uploaded design outputs before quotation preparation."
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
                No design jobs are waiting for review.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
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
                        {job.lead_id ? (
                          <Link href={`/crm/leads/${job.lead_id}`} className="hover:underline">
                            Lead #{job.lead_id}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {designJobStatusLabel(job.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.extracted_items_count ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/design/jobs/${job.id}`}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
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
