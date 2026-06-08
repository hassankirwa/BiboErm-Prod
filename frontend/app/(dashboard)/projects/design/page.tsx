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
import { fetchDesignPendingAccounts } from "@/lib/api/projects/design";
import type { PendingQuotationAccount } from "@/lib/api/projects/quotations";
import { ApiError } from "@/lib/api/errors";
import { Layers, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ProjectDesignPage() {
  const [accounts, setAccounts] = useState<PendingQuotationAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setAccounts(await fetchDesignPendingAccounts());
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load design queue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Design"
        subtitle="Accounts with approved measurements awaiting design and accounting files"
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Design & Accounting Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : accounts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No accounts are waiting for design work.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>Design File</TableHead>
                    <TableHead>Accounting File</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="font-medium">{account.name}</div>
                      </TableCell>
                      <TableCell>{account.latest_approved_visit?.visit_number ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={account.has_design_document ? "default" : "outline"}>
                          {account.has_design_document ? "Uploaded" : "Missing"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.has_accounting_document ? "default" : "outline"}>
                          {account.has_accounting_document ? "Uploaded" : "Missing"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/crm/accounts/${account.id}`}>
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            Upload Docs
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/projects/quotations/new?accountId=${account.id}`}>
                            Start Quotation
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
