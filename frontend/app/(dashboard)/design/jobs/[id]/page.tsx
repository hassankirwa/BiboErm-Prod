"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  approveDesignJob,
  designJobStatusLabel,
  downloadDesignJobPackage,
  extractWincadFile,
  fetchDesignJob,
  type ApiDesignJob,
} from "@/lib/api/design/jobs";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

export default function DesignJobWorkspacePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<ApiDesignJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!Number.isFinite(jobId)) return;
    setLoading(true);
    try {
      setJob(await fetchDesignJob(jobId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load design job.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "upload") {
      fileInputRef.current?.click();
    }
  }, [searchParams]);

  const handleDownloadPackage = async () => {
    if (!job) return;
    setBusy("download");
    try {
      await ensureCsrfCookie();
      const data = await downloadDesignJobPackage(job.id);
      toast.success(
        typeof data === "object" && data && "message" in data
          ? String((data as { message?: string }).message)
          : "Measurement package ready.",
      );
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to download measurement package.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleUpload = async (file: File) => {
    setBusy("upload");
    try {
      await ensureCsrfCookie();
      const result = await extractWincadFile(file);
      toast.success(
        `Extracted ${result.summary.total_items} items from ${result.summary.source_filename ?? file.name}.`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "WINCAD upload failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async () => {
    if (!job) return;
    setBusy("approve");
    try {
      await ensureCsrfCookie();
      await approveDesignJob(job.id, reviewNotes || undefined);
      toast.success("Design approved — lead is ready for quotation.");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve design.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Design job not found.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={job.design_job_number ?? `Design Job #${job.id}`}
        subtitle="Download measurements, upload WINCAD output, and approve design."
        actions={
          <Button variant="outline" asChild>
            <Link href="/design/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All jobs
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{designJobStatusLabel(job.status)}</Badge>
          {job.lead_id ? (
            <Button size="sm" variant="link" className="h-auto px-0" asChild>
              <Link href={`/crm/leads/${job.lead_id}`}>View lead</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-[10px]">
            <CardHeader>
              <CardTitle className="text-base">Measurement report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.measurement_report_id ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Report #{job.measurement_report?.report_number ?? job.measurement_report_id}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy === "download"}
                      onClick={() => void handleDownloadPackage()}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download package
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/site-ops/reports">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        All reports
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No measurement report linked to this job yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[10px]">
            <CardHeader>
              <CardTitle className="text-base">WINCAD upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xls,.xlsx,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <p className="text-sm text-muted-foreground">
                Upload fabrication list or WINCAD export for extraction.
              </p>
              <Button
                disabled={busy === "upload"}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload WINCAD file
              </Button>
              {job.files_count != null ? (
                <p className="text-xs text-muted-foreground">
                  {job.files_count} file(s) · {job.extracted_items_count ?? 0} extracted items
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[10px]">
          <CardHeader>
            <CardTitle className="text-base">Approve design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-notes">Review notes</Label>
              <Textarea
                id="review-notes"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional notes for the quotation team…"
              />
            </div>
            <Button disabled={busy === "approve"} onClick={() => void handleApprove()}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve design
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[10px]">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Downloaded</Label>
              <Input readOnly value={job.downloaded_at ?? "—"} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Uploaded</Label>
              <Input readOnly value={job.uploaded_at ?? "—"} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Approved</Label>
              <Input readOnly value={job.approved_at ?? "—"} className="mt-1 h-9" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
