"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PurchaseRequisition } from "@/lib/api/procurement";
import { listRequisitions } from "@/lib/api/procurement";

export default function RequisitionsPage() {
  const [items, setItems] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRequisitions({ per_page: 50 })
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader title="Requisitions" subtitle="Purchase requisitions and approval queue" />
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>
                      <code className="text-sm">{pr.reference}</code>
                    </TableCell>
                    <TableCell>{pr.project_id ? `#${pr.project_id}` : "—"}</TableCell>
                    <TableCell>{pr.lines?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{pr.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
