"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  assignDesignJob,
  designJobStatusLabel,
  fetchDesignJobs,
  type ApiDesignJob,
} from "@/lib/api/design/jobs";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { Download, ExternalLink, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DesignJobsPage() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead_id");
  const leadId = leadIdParam ? Number(leadIdParam) : undefined;

  const [jobs, setJobs] = useState<ApiDesignJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [designers, setDesigners] = useState<{ id: number; name: string }[]>([]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetchDesignJobs({
        lead_id: leadId,
        per_page: 50,
      });
      setJobs(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load design jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [leadId]);

  useEffect(() => {
    fetchCrmAssignableUsers()
      .then((res) => setDesigners(res.data.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => setDesigners([]));
  }, []);

  const subtitle = useMemo(
    () =>
      leadId
        ? `Design jobs for lead #${leadId}`
        : "Track WINCAD design work from measurement approval to quotation readiness.",
    [leadId],
  );

  const handleAssign = async (jobId: number, designerId: string) => {
    if (!designerId) return;
    setAssigningId(jobId);
    try {
      await ensureCsrfCookie();
      await assignDesignJob(jobId, Number(designerId));
      toast.success("Designer assigned.");
      await loadJobs();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to assign designer.");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader title="Design Jobs" subtitle={subtitle} />
      <div className="space-y-6 p-6">
        <Card className="rounded-[10px]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : jobs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No design jobs in the queue. Jobs are created when measurements are approved.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Designer</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/design/jobs/${job.id}`}
                          className="text-[#1e3a5f] hover:underline"
                        >
                          {job.design_job_number ?? `#${job.id}`}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {job.lead_id ? (
                          <Link
                            href={`/crm/leads/${job.lead_id}`}
                            className="hover:underline"
                          >
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
                      <TableCell>
                        {job.assigned_designer?.name ?? (
                          <Select
                            disabled={assigningId === job.id || designers.length === 0}
                            onValueChange={(value) => void handleAssign(job.id, value)}
                          >
                            <SelectTrigger className="h-8 w-[160px]">
                              <SelectValue placeholder="Assign designer" />
                            </SelectTrigger>
                            <SelectContent>
                              {designers.map((designer) => (
                                <SelectItem key={designer.id} value={String(designer.id)}>
                                  {designer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/design/jobs/${job.id}`}>
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Open
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/design/jobs/${job.id}?action=download`}>
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                              Package
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/design/jobs/${job.id}?action=upload`}>
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                              Upload
                            </Link>
                          </Button>
                          {!job.assigned_designer_id ? (
                            <UserPlus className="hidden" />
                          ) : null}
                        </div>
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
