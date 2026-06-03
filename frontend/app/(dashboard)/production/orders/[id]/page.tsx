"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionCuttingSheetEditor } from "@/components/production/production-cutting-sheet-editor";
import { ProductionOrderActions } from "@/components/production/production-order-actions";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import { ProductionTeamPanel } from "@/components/production/production-team-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  generateCuttingSheet,
  getProductionOrder,
  listCuttingSheet,
  type CuttingSheetLine,
  type ProductionOrder,
} from "@/lib/api/production";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

export default function ProductionOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);
  const { can } = usePermissions();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [cuttingSheet, setCuttingSheet] = useState<CuttingSheetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = can("production.manage");
  const canAssignTeam = can("production.schedule.manage");

  const load = useCallback(() => {
    if (!orderId) return;
    setLoading(true);
    Promise.all([getProductionOrder(orderId), listCuttingSheet(orderId)])
      .then(([orderRes, sheetRes]) => {
        setOrder(orderRes.data);
        setCuttingSheet(sheetRes.data);
      })
      .catch((e: Error) => toast.error(e.message || "Failed to load order"))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerateSheet() {
    try {
      const res = await generateCuttingSheet(orderId);
      setCuttingSheet(res.data);
      toast.success("Cutting sheet generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate sheet");
    }
  }

  if (loading || !order) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {loading ? "Loading…" : "Order not found"}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={order.reference}
        subtitle={order.project?.name ?? `Project #${order.project_id}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/production/orders">Back to orders</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <span>
                Stage: <ProductionStageBadge stage={order.current_stage} />
              </span>
              <span className="capitalize">Status: {order.status.replace(/_/g, " ")}</span>
              <span>FIFO: #{order.fifo_position}</span>
            </div>
            <ProductionOrderActions order={order} onUpdated={load} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductionTeamPanel
              orderId={orderId}
              currentStage={order.current_stage}
              teams={order.teams}
              canAssign={canAssignTeam}
              onUpdated={load}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Stage log</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(order.stage_logs ?? []).map((log) => (
                <li key={log.id} className="flex justify-between border-b border-border pb-2">
                  <span>{log.stage_label ?? log.stage}</span>
                  <span className="text-muted-foreground">{log.status}</span>
                </li>
              ))}
              {(order.stage_logs ?? []).length === 0 && (
                <li className="text-muted-foreground">No stage activity yet</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cutting sheet</CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={handleGenerateSheet}>
                Regenerate from BOM
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ProductionCuttingSheetEditor
              orderId={orderId}
              lines={cuttingSheet}
              canEdit={canManage}
              onUpdated={load}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
