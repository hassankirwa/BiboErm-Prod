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
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function DesignPackagesPage() {
  const [jobs, setJobs] = useState<ApiDesignJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchDesignJobs({
          status: "design_required",
          per_page: 50,
        });
        setJobs(res.data);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load packages queue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Measurement Packages"
        subtitle="Download approved measurement packages for WINCAD design work."
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
                No jobs are waiting for package download.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/design/jobs/${job.id}?action=download`}>
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Download
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
