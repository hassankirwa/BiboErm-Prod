"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionCuttingSheetEditor } from "@/components/production/production-cutting-sheet-editor";
import { ProductionGlassStatus } from "@/components/production/production-glass-status";
import { ProductionMaterialReleasesPanel } from "@/components/production/production-material-releases-panel";
import { ProductionOrderActions } from "@/components/production/production-order-actions";
import { ProductionQcLinks } from "@/components/production/production-qc-links";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import { ProductionTeamPanel } from "@/components/production/production-team-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  generateCuttingSheet,
  getProductionOrder,
  listCuttingSheet,
  type CuttingSheetLine,
  type ProductionOrder,
} from "@/lib/api/production";
import { usePermissions } from "@/hooks/use-permissions";
import { canManageProductionStages, stageProgressPercent } from "@/lib/production/utils";
import { toast } from "sonner";

export default function ProductionOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);
  const invalidId = !id || Number.isNaN(orderId) || orderId < 1;
  const { can } = usePermissions();
  const { user } = useAuth();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [cuttingSheet, setCuttingSheet] = useState<CuttingSheetLine[]>([]);
  const [loading, setLoading] = useState(!invalidId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const canAssignTeam = can("production.schedule.manage");
  const canViewQc = can("qc.view") || can("qc.inspect");

  const canManageStages = order
    ? canManageProductionStages(can, user?.id, order)
    : false;

  const load = useCallback(() => {
    if (invalidId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    Promise.all([getProductionOrder(orderId), listCuttingSheet(orderId)])
      .then(([orderRes, sheetRes]) => {
        setOrder(orderRes.data);
        setCuttingSheet(sheetRes.data);
      })
      .catch((err) => {
        const message = getApiErrorMessage(err, "Failed to load order");
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [invalidId, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerateSheet() {
    setRegenerating(true);
    try {
      const res = await generateCuttingSheet(orderId);
      setCuttingSheet(res.data);
      toast.success("Cutting sheet generated from BOM");
      setConfirmRegenerate(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate sheet"));
    } finally {
      setRegenerating(false);
    }
  }

  if (invalidId) {
    return (
      <div className="space-y-3 p-6 text-sm text-muted-foreground">
        <p>Invalid production order link.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/production/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!order) {
    return (
      <div className="space-y-3 p-6 text-sm text-muted-foreground">
        <p>{loadError ?? "Order not found"}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/production/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const projectLabel = order.project?.name ?? `Project #${order.project_id}`;
  const pipelinePercent = stageProgressPercent(order.current_stage);
  const projectPercent = order.project?.completion_percent;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={order.reference}
        subtitle={
          order.project?.reference
            ? `${projectLabel} · ${order.project.reference}`
            : projectLabel
        }
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
            <p>
              Project:{" "}
              <Link
                href={`/projects/${order.project_id}?tab=production`}
                className="font-medium text-primary hover:underline"
              >
                {projectLabel}
              </Link>
            </p>
            <div className="flex flex-wrap gap-4">
              <span>
                Stage: <ProductionStageBadge stage={order.current_stage} />
              </span>
              <span className="capitalize">Status: {order.status.replace(/_/g, " ")}</span>
              <span>FIFO: #{order.fifo_position}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Production pipeline</span>
                  <span>{pipelinePercent}%</span>
                </div>
                <Progress value={pipelinePercent} className="h-2" />
              </div>
              {typeof projectPercent === "number" ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Project overall (PM)</span>
                    <span>{projectPercent}%</span>
                  </div>
                  <Progress value={projectPercent} className="h-2" />
                </div>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Pipeline % tracks shop-floor stages only. Project % is the PM lifecycle on the
              project overview — both are expected to differ until fabrication advances.
            </p>
            <ProductionOrderActions
              order={order}
              cuttingSheetLines={cuttingSheet}
              onUpdated={load}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Glass procurement</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductionGlassStatus
              projectId={order.project_id}
              projectReference={order.project?.reference}
              projectName={order.project?.name}
              productionOrderId={order.id}
              glassAssembly={order.glass_assembly}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material releases</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductionMaterialReleasesPanel
              releases={order.material_releases ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality control</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductionQcLinks
              productionOrderId={orderId}
              projectId={order.project_id}
              canViewQc={canViewQc}
              canInspectQc={can("qc.inspect")}
            />
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
            {canManageStages && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmRegenerate(true)}
              >
                Regenerate from BOM
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ProductionCuttingSheetEditor
              orderId={orderId}
              lines={cuttingSheet}
              canEdit={canManageStages}
              onUpdated={load}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate cutting sheet?</DialogTitle>
            <DialogDescription>
              This replaces existing cutting lines with a fresh BOM-derived sheet. Manual
              edits will be lost unless you exported them elsewhere.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRegenerate(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateSheet} disabled={regenerating}>
              {regenerating ? "Generating…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
