"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { MediaImage } from "@/components/media/media-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PRODUCTION_STAGE_LABELS,
  type CuttingSheetLine,
  type ProductionOrder,
} from "@/lib/api/production";
import { usePermissions } from "@/hooks/use-permissions";
import { canManageProductionStages, stageProgressPercent } from "@/lib/production/utils";
import { toast } from "sonner";

/** True when sheet still looks like one BOM length per bar (pre-nesting). */
function cuttingSheetNeedsNestRebuild(lines: CuttingSheetLine[]): boolean {
  if (lines.length < 2) return false;

  const alreadyNested = lines.some(
    (line) => (line.cuts?.length ?? 0) > 1 || (line.pieces ?? 1) > 1,
  );
  if (alreadyNested) return false;

  const byProfile = new Map<string, number[]>();
  for (const line of lines) {
    const key = (line.profile_code || "").trim().toUpperCase();
    if (!key) continue;
    const lengths = byProfile.get(key) ?? [];
    lengths.push(line.cut_length_mm);
    byProfile.set(key, lengths);
  }

  const usable = 6000 - 20;
  for (const lengths of byProfile.values()) {
    if (lengths.length < 2) continue;
    const sorted = [...lengths].sort((a, b) => b - a);
    // Two longest that still fit together ⇒ nesting opportunity the old sheet missed.
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i] + sorted[j] <= usable) return true;
      }
    }
  }

  return false;
}

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
  const nestRebuildAttempted = useRef(false);
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

  async function handleGenerateSheet(opts?: { silent?: boolean }) {
    setRegenerating(true);
    try {
      const res = await generateCuttingSheet(orderId);
      setCuttingSheet(res.data);
      if (!opts?.silent) {
        toast.success("Cutting sheet nested from BOM (shared bars per profile)");
      }
      setConfirmRegenerate(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate sheet"));
    } finally {
      setRegenerating(false);
    }
  }

  // Old sheets were 1 BOM length = 1 bar. Rebuild automatically when nesting is missing.
  useEffect(() => {
    if (!order || order.current_stage !== "cutting" || regenerating) return;
    if (nestRebuildAttempted.current) return;
    if (!cuttingSheetNeedsNestRebuild(cuttingSheet)) return;
    nestRebuildAttempted.current = true;
    void handleGenerateSheet({ silent: true }).then(() => {
      toast.message("Cutting sheet rebuilt to nest cuts onto shared bars");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot rebuild for stale sheets
  }, [order?.id, order?.current_stage, cuttingSheet, regenerating]);

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
  const activeStageLabel =
    PRODUCTION_STAGE_LABELS[order.current_stage] ?? order.current_stage;
  const isCutting = order.current_stage === "cutting";
  const isFabrication =
    order.current_stage === "fabrication" || order.current_stage === "sash";
  const isGlassAssembly = order.current_stage === "glass_assembly";
  const isNairobi =
    order.project?.location_type === "nairobi" ||
    order.project?.install_mode === "nairobi_site_install";
  const showGlassOnActive = isGlassAssembly || isFabrication;

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
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="active">{activeStageLabel}</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="team">Team &amp; QC</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stage actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductionOrderActions
                  order={order}
                  cuttingSheetLines={cuttingSheet}
                  onUpdated={load}
                />
              </CardContent>
            </Card>

            {isCutting && (
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
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Cuts for the same profile are nested onto shared bars (with ~20 mm end
                    room). Used / waste are per physical bar and autosave. Waste &gt; 0 becomes
                    production offcuts when you complete cutting. If this still looks like one
                    length per bar, run migrate then Regenerate from BOM.
                  </p>
                  <ProductionCuttingSheetEditor
                    orderId={orderId}
                    lines={cuttingSheet}
                    canEdit={canManageStages}
                    onLineUpdated={(line) => {
                      setCuttingSheet((prev) =>
                        prev.map((row) => (row.id === line.id ? line : row)),
                      );
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {isFabrication && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {order.current_stage === "sash"
                      ? "Sash fabrication"
                      : "Frame fabrication"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Complete frame fabrication, then sash fabrication. After sash is
                    complete:
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    {isNairobi ? (
                      <li className="text-foreground">
                        Nairobi projects are forwarded to the field team for site
                        installation (factory continues into assembly &amp; glass).{" "}
                        <Link
                          href="/field-installation/jobs"
                          className="text-primary hover:underline"
                        >
                          Open field installation
                        </Link>
                      </li>
                    ) : (
                      <li className="text-foreground">
                        Outside Nairobi continues full factory fabrication into glass
                        assembly and finishing before field install.
                      </li>
                    )}
                  </ul>
                  <p>
                    Use stage actions above to start or complete{" "}
                    <span className="font-medium text-foreground">{activeStageLabel}</span>.
                  </p>
                </CardContent>
              </Card>
            )}

            {showGlassOnActive && (
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
            )}

            {order.current_stage === "qc_post_fabrication" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">After-assembly QC</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductionQcLinks
                    productionOrderId={orderId}
                    projectId={order.project_id}
                    currentStage={order.current_stage}
                    canViewQc={canViewQc}
                    canInspectQc={can("qc.inspect")}
                  />
                </CardContent>
              </Card>
            )}

            {!isCutting && !isFabrication && !isGlassAssembly && order.current_stage !== "qc_post_fabrication" && (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Use stage actions above to start or complete{" "}
                  <span className="font-medium text-foreground">{activeStageLabel}</span>.
                  Cutting tools and glass controls appear when those stages are active.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="project" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Name: </span>
                  <Link
                    href={`/projects/${order.project_id}?tab=production`}
                    className="font-medium text-primary hover:underline"
                  >
                    {projectLabel}
                  </Link>
                </p>
                {order.project?.reference && (
                  <p>
                    <span className="text-muted-foreground">Reference: </span>
                    {order.project.reference}
                  </p>
                )}
                {order.project?.stage && (
                  <p>
                    <span className="text-muted-foreground">PM stage: </span>
                    {order.project.stage.replace(/_/g, " ")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/projects/${order.project_id}?tab=fabrication`}>
                      Project fabrication
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/projects/${order.project_id}?tab=production`}>
                      Project production
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team assignments</CardTitle>
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
              <CardHeader>
                <CardTitle className="text-base">Quality control</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductionQcLinks
                  productionOrderId={orderId}
                  projectId={order.project_id}
                  currentStage={order.current_stage}
                  canViewQc={canViewQc}
                  canInspectQc={can("qc.inspect")}
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
            {!showGlassOnActive && (
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
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stage log</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {(order.stage_logs ?? []).map((log) => {
                    const evidenceUrls =
                      log.evidence_urls?.length
                        ? log.evidence_urls
                        : log.evidence_url
                          ? [log.evidence_url]
                          : [];
                    return (
                      <li
                        key={log.id}
                        className="space-y-2 border-b border-border pb-3 last:border-b-0"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">
                            {log.stage_label ?? log.stage}
                          </span>
                          <span className="text-muted-foreground">{log.status}</span>
                        </div>
                        {log.notes ? (
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {log.notes}
                          </p>
                        ) : null}
                        {evidenceUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {evidenceUrls.map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-md border border-border"
                              >
                                <MediaImage
                                  src={url}
                                  alt={`${log.stage_label ?? log.stage} evidence`}
                                  className="h-20 w-20 object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                  {(order.stage_logs ?? []).length === 0 && (
                    <li className="text-muted-foreground">No stage activity yet</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
