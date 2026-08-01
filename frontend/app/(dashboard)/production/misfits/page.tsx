"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  approveDesignChangeOrder,
  createDesignChangeRemake,
  closeDesignChangeOrder,
  logProjectDelay,
} from "@/lib/api/projects";
import {
  listProductionMisfits,
  type ProductionMisfit,
} from "@/lib/api/production";
import { toast } from "sonner";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export default function ProductionMisfitsPage() {
  const [items, setItems] = useState<ProductionMisfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [delayFor, setDelayFor] = useState<ProductionMisfit | null>(null);
  const [delayDays, setDelayDays] = useState("1");
  const [delayReason, setDelayReason] = useState("client_follow_up");
  const [delayNotes, setDelayNotes] = useState("");
  const [delaySaving, setDelaySaving] = useState(false);

  const reload = useCallback(async () => {
    const res = await listProductionMisfits();
    setItems(res.data);
  }, []);

  useEffect(() => {
    reload()
      .catch((e) => toast.error(getApiErrorMessage(e, "Failed to load misfits.")))
      .finally(() => setLoading(false));
  }, [reload]);

  async function runAction(key: string, fn: () => Promise<unknown>, success: string) {
    setBusyKey(key);
    try {
      await fn();
      toast.success(success);
      await reload();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Action failed."));
    } finally {
      setBusyKey(null);
    }
  }

  async function submitDelay() {
    if (!delayFor?.project) return;
    setDelaySaving(true);
    try {
      await logProjectDelay(delayFor.project.id, {
        stage: delayFor.project.stage || "installation",
        reason: delayReason,
        days_lost: Number(delayDays) || 0,
        notes:
          delayNotes ||
          `Misfit follow-up: ${delayFor.unit_label}${
            delayFor.misfit_notes ? ` — ${delayFor.misfit_notes}` : ""
          }`,
      });
      toast.success("Client delay logged for follow-up.");
      setDelayFor(null);
      setDelayNotes("");
      setDelayDays("1");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to log delay."));
    } finally {
      setDelaySaving(false);
    }
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Installation misfits"
        subtitle="Openings that need remake or readjustment before field install can finish"
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${items.length} open misfit${items.length === 1 ? "" : "s"}`}
          </p>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
        </div>

        {!loading && items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No snagged openings. When field records a misfit, it appears here for remake.
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const dco = item.design_change_order;
            const remake = dco?.remake_production_order;
            const remakeReady = remake?.status === "completed";
            return (
              <Card key={item.unit_id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{item.unit_label}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {[
                        item.project?.reference,
                        item.project?.name,
                        item.unit_floor,
                        item.product_type,
                        item.opening_ref && `Ref ${item.opening_ref}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      Snagged
                    </Badge>
                    {dco ? (
                      <Badge variant="outline">{dco.status.replace(/_/g, " ")}</Badge>
                    ) : null}
                    {remakeReady ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Remake ready
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {item.misfit_notes ? (
                    <p>
                      <span className="font-medium">Misfit: </span>
                      {item.misfit_notes}
                    </p>
                  ) : null}
                  {item.non_conformity ? (
                    <p className="text-muted-foreground">
                      NC #{item.non_conformity.id} · {item.non_conformity.nc_type.replace(/_/g, " ")} ·{" "}
                      {item.non_conformity.status}
                    </p>
                  ) : null}
                  {remake ? (
                    <p className="text-muted-foreground">
                      Remake PO{" "}
                      <Link
                        href={`/production/orders/${remake.id}`}
                        className="text-primary hover:underline"
                      >
                        {remake.reference}
                      </Link>{" "}
                      · {remake.status.replace(/_/g, " ")}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {item.project ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/projects/${item.project.id}?tab=changes`}>
                          Project design changes
                        </Link>
                      </Button>
                    ) : null}
                    {item.job ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/field-installation/jobs/${item.job.id}`}>
                          Field job
                        </Link>
                      </Button>
                    ) : null}
                    {dco && (dco.status === "drafted" || dco.status === "awaiting_remeasure") ? (
                      <Button
                        size="sm"
                        disabled={busyKey === `approve-${dco.id}`}
                        onClick={() =>
                          void runAction(
                            `approve-${dco.id}`,
                            () =>
                              approveDesignChangeOrder(dco.id, {
                                target_stage: "final_design_approval",
                              }),
                            "Design change approved — rewound for remake prep.",
                          )
                        }
                      >
                        Approve & rewind
                      </Button>
                    ) : null}
                    {dco &&
                    !dco.remake_production_order_id &&
                    ["design_in_progress", "bom_revised", "materials_ready"].includes(dco.status) ? (
                      <Button
                        size="sm"
                        disabled={busyKey === `remake-${dco.id}`}
                        onClick={() =>
                          void runAction(
                            `remake-${dco.id}`,
                            () => createDesignChangeRemake(dco.id),
                            "Remake production order created.",
                          )
                        }
                      >
                        Create remake PO
                      </Button>
                    ) : null}
                    {dco && remakeReady && dco.status !== "closed" ? (
                      <Button
                        size="sm"
                        disabled={busyKey === `close-${dco.id}`}
                        onClick={() =>
                          void runAction(
                            `close-${dco.id}`,
                            () => closeDesignChangeOrder(dco.id),
                            "Design change closed — field can install remade opening.",
                          )
                        }
                      >
                        Close & release to install
                      </Button>
                    ) : null}
                    {item.project ? (
                      <Button size="sm" variant="secondary" onClick={() => setDelayFor(item)}>
                        Log client delay
                      </Button>
                    ) : null}
                  </div>

                  {remakeReady || dco?.status === "closed" ? (
                    <p className="text-xs text-success">
                      Remake available — open the field job and use <strong>Mark remade done</strong> on
                      this opening so installation can complete.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      After remake is produced, close the design change and mark the opening installed on
                      the field job.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={delayFor !== null} onOpenChange={(open) => !open && setDelayFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log client delay</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {delayFor?.project?.reference} · {delayFor?.unit_label}
            </p>
            <div>
              <Label>Reason</Label>
              <select
                className={selectCls}
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
              >
                <option value="client_follow_up">Client follow-up</option>
                <option value="awaiting_client_decision">Awaiting client decision</option>
                <option value="remeasure_required">Remeasure required</option>
                <option value="site_not_ready">Site not ready</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Days lost</Label>
              <Input
                type="number"
                min={0}
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Shown on client portal schedule notes…"
                value={delayNotes}
                onChange={(e) => setDelayNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={delaySaving} onClick={() => setDelayFor(null)}>
              Cancel
            </Button>
            <Button disabled={delaySaving} onClick={() => void submitDelay()}>
              {delaySaving ? "Saving…" : "Log delay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
