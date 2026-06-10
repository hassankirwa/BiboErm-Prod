"use client";

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
  downloadMeasurementReportPackage,
  fetchMeasurementReports,
  type ApiMeasurementReport,
} from "@/lib/api/site-ops/measurement-reports";
import { ApiError } from "@/lib/api/errors";
import { Download } from "lucide-react";
import { toast } from "sonner";

function formatStatus(status: string | null): string {
  if (!status) return "—";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SiteOpsMeasurementReportsPage() {
  const [reports, setReports] = useState<ApiMeasurementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchMeasurementReports({ per_page: 50 });
        setReports(res.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to load measurement reports.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = async (report: ApiMeasurementReport) => {
    setDownloadingId(report.id);
    try {
      const data = await downloadMeasurementReportPackage(report.id);
      toast.success(
        data.message ??
          `Package ready for ${data.report_number ?? `report #${report.id}`}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to download measurement package.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Measurement Reports"
        subtitle="Download and review measurement packages from completed site visits."
      />
      <div className="space-y-6 p-6">
        <Card className="rounded-[10px]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : reports.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No measurement reports yet. Reports appear after visits are approved.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.report_number ?? `#${report.id}`}
                      </TableCell>
                      <TableCell>
                        {report.site_visit?.title ??
                          report.site_visit?.visit_number ??
                          "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatStatus(report.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        {report.approved_at
                          ? new Date(report.approved_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadingId === report.id}
                          onClick={() => void handleDownload(report)}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          {downloadingId === report.id ? "Preparing…" : "Download"}
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
