"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ProjectDetail,
  ProjectMaterialStatus,
  ProjectProcurementReceipt,
} from "@/lib/api/projects";
import { Package, Truck } from "lucide-react";

const grnStatusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  verifying: "bg-warning/10 text-warning",
  verified: "bg-success/10 text-success",
};

function formatGrnStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lineItemLabel(line: ProjectProcurementReceipt["lines"][number]) {
  if (line.warehouse_item_sku && line.warehouse_item_name) {
    return `${line.warehouse_item_sku} · ${line.warehouse_item_name}`;
  }
  return line.description;
}

type ProjectDetailProcurementProps = {
  project: ProjectDetail;
  materialStatus: ProjectMaterialStatus | null;
};

export function ProjectDetailProcurement({
  project,
  materialStatus,
}: ProjectDetailProcurementProps) {
  const receipts = materialStatus?.goods_receipts ?? [];
  const released = materialStatus?.materials_released ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-primary" />
              Materials released to production
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Stock handed from warehouse reservations into production (cutting /
              fabrication). Separate from GRNs, which are inbound receipts.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/warehouse/reservations?project_id=${project.id}`}>
              Reservation workbench
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {released.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No materials released yet for this project. Reserve stock first, then
              release from the warehouse workbench when production starts a stage.
            </p>
          ) : (
            <div className="divide-y rounded-md border text-sm">
              {released.map((line) => (
                <div
                  key={line.item_id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <span>
                    {line.sku ? (
                      <span className="mr-1 font-mono text-xs text-muted-foreground">
                        {line.sku}
                      </span>
                    ) : null}
                    {line.name ?? `Item #${line.item_id}`}
                  </span>
                  <span className="text-muted-foreground">
                    Released {line.quantity_released}
                    {line.unit_of_measure ? ` ${line.unit_of_measure}` : ""}
                    {" · "}
                    Reserved {line.quantity_reserved}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-amber-600" />
              Procured deliveries (GRNs)
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Goods receipts linked to {project.reference} (project + purchase order
              match). These put stock into the warehouse — they are not production
              releases.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/procurement/goods-receipts?project_id=${project.id}`}>
              All receiving logs
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No goods receipts linked to this project yet.
            </p>
          ) : (
            receipts.map((grn) => (
              <div key={grn.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/procurement/goods-receipts/${grn.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {grn.grn_number}
                      </Link>
                      <Badge
                        variant="outline"
                        className={
                          grnStatusColors[grn.status] ?? "bg-muted text-muted-foreground"
                        }
                      >
                        {formatGrnStatus(grn.status)}
                      </Badge>
                      {grn.purchase_order ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          asChild
                        >
                          <Link href={`/procurement/orders/${grn.purchase_order.id}`}>
                            {grn.purchase_order.reference}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    {grn.purchase_order?.supplier_name ? (
                      <p className="text-xs text-muted-foreground">
                        Supplier: {grn.purchase_order.supplier_name}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Received {formatDate(grn.received_at)}
                      {grn.verified_at ? ` · Verified ${formatDate(grn.verified_at)}` : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/warehouse/receive?grn=${grn.id}`}>Put away</Link>
                  </Button>
                </div>

                {(grn.notes || grn.quality_inspection_notes || grn.putaway_notes) && (
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    {grn.notes ? (
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">GRN notes</p>
                        <p className="whitespace-pre-wrap">{grn.notes}</p>
                      </div>
                    ) : null}
                    {grn.quality_inspection_notes ? (
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">QC notes</p>
                        <p className="whitespace-pre-wrap">{grn.quality_inspection_notes}</p>
                      </div>
                    ) : null}
                    {grn.putaway_notes ? (
                      <div className="rounded-md bg-muted/40 px-3 py-2 sm:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Putaway notes
                        </p>
                        <p className="whitespace-pre-wrap">{grn.putaway_notes}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {grn.lines.length > 0 ? (
                  <div className="divide-y rounded-md border text-sm">
                    {grn.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium">{lineItemLabel(line)}</p>
                          <div className="flex flex-wrap gap-2">
                            {line.is_procurement_only ? (
                              <Badge variant="outline" className="text-xs">
                                Procurement only
                              </Badge>
                            ) : line.warehouse_item_category ? (
                              <Badge variant="outline" className="text-xs capitalize">
                                {String(line.warehouse_item_category).replace(/_/g, " ")}
                              </Badge>
                            ) : null}
                            {line.to_bin_id ? (
                              <span className="text-xs text-muted-foreground">
                                Bin #{line.to_bin_id}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <p>
                            Recv {line.qty_received} · Acc {line.qty_accepted}
                            {Number(line.qty_rejected) > 0
                              ? ` · Rej ${line.qty_rejected}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No line items on this receipt.</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
