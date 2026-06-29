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
  fetchQuotationRequests,
  quotationRequestStatusLabel,
  type ApiQuotationRequest,
} from "@/lib/api/quotation/requests";
import { ApiError } from "@/lib/api/errors";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function QuotationRequestsPage() {
  const [requests, setRequests] = useState<ApiQuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchQuotationRequests({ per_page: 50 });
        setRequests(res.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to load quotation requests.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Quotation Requests"
        subtitle="Leads ready for proforma quotation preparation."
      />
      <div className="space-y-6 p-6">
        <Card className="rounded-[10px]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : requests.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No quotation requests yet. Requests are created when design is approved.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.request_number ?? `#${request.id}`}
                      </TableCell>
                      <TableCell>
                        {request.lead_id ? (
                          <Link
                            href={`/crm/leads/${request.lead_id}`}
                            className="hover:underline"
                          >
                            {request.lead?.name ?? `Lead #${request.lead_id}`}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {quotationRequestStatusLabel(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link href="/quotation/proforma">
                            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                            Proforma Quotation
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
