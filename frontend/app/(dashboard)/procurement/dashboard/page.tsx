"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getGlassPriceAnalytics,
  getProcurementDashboard,
  listGlassOrders,
  listGoodsReceipts,
  listTransportOrders,
  type GlassOrder,
  type GlassPriceAnalyticsSummary,
  type GoodsReceipt,
  type ProcurementDashboard,
  type TransportOrder,
} from "@/lib/api/procurement";
import { usePermissions } from "@/hooks/use-permissions";
import { formatKes, formatPricePerSqm } from "@/lib/procurement/glass-pricing";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  verifying: "bg-warning/10 text-warning",
  verified: "bg-success/10 text-success",
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-info/10 text-info",
  delivered: "bg-success/10 text-success",
  scheduled: "bg-muted text-muted-foreground",
  in_transit: "bg-info/10 text-info",
  arrived: "bg-success/10 text-success",
};

export default function ProcurementDashboardPage() {
  const { canAny } = usePermissions();
  const canViewTransport = canAny("procurement.transport.manage", "procurement.manage");
  const [stats, setStats] = useState<ProcurementDashboard | null>(null);
  const [glassPricing, setGlassPricing] = useState<GlassPriceAnalyticsSummary | null>(null);
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [glass, setGlass] = useState<GlassOrder[]>([]);
  const [transport, setTransport] = useState<TransportOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getProcurementDashboard(),
      getGlassPriceAnalytics(),
      listGoodsReceipts({ per_page: 5 }),
      listGlassOrders({ per_page: 5 }),
      canViewTransport ? listTransportOrders({ per_page: 5 }) : Promise.resolve(null),
    ])
      .then(([dashboardRes, glassPriceRes, grnRes, glassRes, transportRes]) => {
        if (dashboardRes.status === "fulfilled") {
          setStats(dashboardRes.value.data);
        } else {
          toast.error(
            dashboardRes.reason instanceof Error
              ? dashboardRes.reason.message
              : "Failed to load dashboard stats.",
          );
        }

        if (glassPriceRes.status === "fulfilled") {
          setGlassPricing(glassPriceRes.value.data.summary);
        }

        if (grnRes.status === "fulfilled") {
          setGrns(grnRes.value.data);
        } else {
          toast.error(
            grnRes.reason instanceof Error
              ? grnRes.reason.message
              : "Failed to load goods receipts.",
          );
        }

        if (glassRes.status === "fulfilled") {
          setGlass(glassRes.value.data);
        } else {
          toast.error(
            glassRes.reason instanceof Error
              ? glassRes.reason.message
              : "Failed to load glass queue.",
          );
        }

        if (!canViewTransport) {
          setTransport([]);
        } else if (transportRes.status === "fulfilled" && transportRes.value) {
          setTransport(transportRes.value.data);
        } else if (transportRes.status === "rejected") {
          toast.error(
            transportRes.reason instanceof Error
              ? transportRes.reason.message
              : "Failed to load transport orders.",
          );
        }
      })
      .finally(() => setLoading(false));
  }, [canViewTransport]);

  const cards = stats
    ? [
        { label: "Open Requisitions", value: stats.open_requisitions },
        { label: "POs Awaiting Approval", value: stats.pos_awaiting_approval },
        { label: "Pending GRNs", value: stats.pending_grns },
        { label: "Glass Queue", value: stats.glass_queue },
        { label: "Delays This Week", value: stats.delays_this_week },
      ]
    : [];

  const materialsNeeding =
    (stats?.project_material_lines_needing_requisition ?? 0) +
    (stats?.low_stock_items_needing_requisition ?? 0);
  const projectsWithShortages = stats?.projects_with_material_shortages ?? 0;
  const lowStockNeeding = stats?.low_stock_items_needing_requisition ?? 0;
  const projectLinesNeeding = stats?.project_material_lines_needing_requisition ?? 0;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Procurement Dashboard"
        subtitle="Track approvals, GRNs, glass orders, and transport"
      />
      <div className="space-y-6 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        ) : (
          <>
            {materialsNeeding > 0 ? (
              <Card className="border-amber-300/80 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                      Materials need a requisition
                    </p>
                    <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                      {projectsWithShortages > 0
                        ? `${projectsWithShortages} project${projectsWithShortages === 1 ? "" : "s"} · ${projectLinesNeeding} project material line${projectLinesNeeding === 1 ? "" : "s"}`
                        : null}
                      {projectsWithShortages > 0 && lowStockNeeding > 0 ? " · " : null}
                      {lowStockNeeding > 0
                        ? `${lowStockNeeding} low-stock item${lowStockNeeding === 1 ? "" : "s"}`
                        : null}
                      {" "}waiting to be ordered.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/procurement/project-materials"
                      className="inline-flex h-9 items-center rounded-md border border-amber-400/60 bg-white px-3 text-sm font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50 dark:hover:bg-amber-900"
                    >
                      Project materials
                    </Link>
                    <Link
                      href="/procurement/requisitions/create?tab=project-materials"
                      className="inline-flex h-9 items-center rounded-md bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800"
                    >
                      Create requisition
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-5">
              {cards.map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-teal-200/70 bg-gradient-to-br from-teal-50/80 to-background dark:border-teal-900 dark:from-teal-950/30">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">Glass price projection</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Monthly glass spend and average buying price per m² from delivered orders.
                  </p>
                </div>
                <Link
                  href="/procurement/glass-price-analytics"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open analytics
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Spend this month</p>
                    <p className="text-2xl font-semibold">
                      {formatKes(glassPricing?.this_month_spend ?? 0)}
                    </p>
                    {glassPricing?.spend_change_pct != null ? (
                      <p className="text-xs text-muted-foreground">
                        {glassPricing.spend_change_pct >= 0 ? "+" : ""}
                        {glassPricing.spend_change_pct}% vs last month
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg price / m²</p>
                    <p className="text-2xl font-semibold">
                      {formatPricePerSqm(glassPricing?.avg_price_per_sqm)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Area in range</p>
                    <p className="text-2xl font-semibold">
                      {(glassPricing?.total_area_m2 ?? 0).toFixed(2)} m²
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Goods Receipts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grns.map((grn) => (
                    <div
                      key={grn.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{grn.grn_number}</p>
                        <p className="text-xs text-muted-foreground">
                          PO #{grn.purchase_order_id} · Project {grn.project_id ?? "Stock"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={statusColors[grn.status] ?? ""}>
                          {grn.status.replaceAll("_", " ")}
                        </Badge>
                        <Link
                          className="text-sm text-primary underline-offset-4 hover:underline"
                          href={`/procurement/goods-receipts/${grn.id}`}
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                  {grns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No GRNs found.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Glass Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {glass.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.project?.reference
                            ? `${order.project.name} · ${order.project.reference}`
                            : `Project #${order.project_id}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={statusColors[order.status] ?? ""}>
                          {order.status.replaceAll("_", " ")}
                        </Badge>
                        <Link
                          className="text-sm text-primary underline-offset-4 hover:underline"
                          href={`/procurement/glass-orders/${order.id}`}
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                  {glass.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No glass orders pending.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transport</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transport.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{item.transport_number}</p>
                        <p className="text-xs text-muted-foreground">
                          PO #{item.purchase_order_id} · {item.driver_name ?? "No driver"}
                        </p>
                      </div>
                      <Badge variant="secondary" className={statusColors[item.status] ?? ""}>
                        {item.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  ))}
                  {transport.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transport orders scheduled.</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
