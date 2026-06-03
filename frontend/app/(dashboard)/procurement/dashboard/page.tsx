"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProcurementDashboard,
  listGlassOrders,
  listGoodsReceipts,
  listTransportOrders,
  type GlassOrder,
  type GoodsReceipt,
  type ProcurementDashboard,
  type TransportOrder,
} from "@/lib/api/procurement";
import { usePermissions } from "@/hooks/use-permissions";
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
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [glass, setGlass] = useState<GlassOrder[]>([]);
  const [transport, setTransport] = useState<TransportOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getProcurementDashboard(),
      listGoodsReceipts({ per_page: 5 }),
      listGlassOrders({ per_page: 5 }),
      canViewTransport ? listTransportOrders({ per_page: 5 }) : Promise.resolve(null),
    ])
      .then(([dashboardRes, grnRes, glassRes, transportRes]) => {
        if (dashboardRes.status === "fulfilled") {
          setStats(dashboardRes.value.data);
        } else {
          toast.error(dashboardRes.reason instanceof Error ? dashboardRes.reason.message : "Failed to load dashboard stats.");
        }

        if (grnRes.status === "fulfilled") {
          setGrns(grnRes.value.data);
        } else {
          toast.error(grnRes.reason instanceof Error ? grnRes.reason.message : "Failed to load goods receipts.");
        }

        if (glassRes.status === "fulfilled") {
          setGlass(glassRes.value.data);
        } else {
          toast.error(glassRes.reason instanceof Error ? glassRes.reason.message : "Failed to load glass queue.");
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

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader title="Procurement Dashboard" subtitle="Track approvals, GRNs, glass orders, and transport" />
      <div className="space-y-6 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              {cards.map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Goods Receipts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grns.map((grn) => (
                    <div key={grn.id} className="flex items-center justify-between rounded-lg border p-3">
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
                        <Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/procurement/goods-receipts/${grn.id}`}>
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                  {grns.length === 0 ? <p className="text-sm text-muted-foreground">No GRNs found.</p> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Glass Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {glass.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">Project #{order.project_id}</p>
                      </div>
                      <Badge variant="secondary" className={statusColors[order.status] ?? ""}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  ))}
                  {glass.length === 0 ? <p className="text-sm text-muted-foreground">No glass orders pending.</p> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transport</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transport.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
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
                  {transport.length === 0 ? <p className="text-sm text-muted-foreground">No transport orders scheduled.</p> : null}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
