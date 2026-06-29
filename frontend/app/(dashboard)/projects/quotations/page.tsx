"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPendingQuotationAccounts, type PendingQuotationAccount } from "@/lib/api/projects/quotations";
import { ApiError } from "@/lib/api/errors";
import { FileSpreadsheet, Plus, Ruler } from "lucide-react";
import { toast } from "sonner";

export default function ProjectQuotationsPage() {
  const [pending, setPending] = useState<PendingQuotationAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setPending(await fetchPendingQuotationAccounts());
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load pending quotations.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Proforma Quotation"
        subtitle="Draft and send proforma quotations after site measurements are approved"
        actions={
          <Button asChild>
            <Link href="/projects/quotations/new">
              <Plus className="mr-2 h-4 w-4" />
              New Proforma Quotation
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4" />
              Pending — Measurements Done, No Proforma Quotation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No accounts are waiting for a proforma quotation. Approved site visits will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Approved Visit</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-xs text-muted-foreground">{account.account_number ?? "—"}</div>
                      </TableCell>
                      <TableCell>{account.primary_contact?.name ?? "—"}</TableCell>
                      <TableCell>
                        {account.latest_approved_visit?.visit_number ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {account.has_accounting_document ? (
                            <Badge variant="secondary">Accounting</Badge>
                          ) : null}
                          {account.has_design_document ? (
                            <Badge variant="secondary">Design</Badge>
                          ) : null}
                          {!account.has_accounting_document && !account.has_design_document ? (
                            <Badge variant="outline">Awaiting upload</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link href={`/projects/quotations/new?accountId=${account.id}`}>
                            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                            Create Proforma Quotation
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
