"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScheduleOrder } from "@/lib/api/production";
import { updateProductionSchedule } from "@/lib/api/production";
import {
  formatProductionStage,
  materialReadinessLabel,
  stageProgressPercent,
} from "@/lib/production/utils";
import { ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";

type Props = {
  orders: ScheduleOrder[];
  canReorder?: boolean;
  onScheduleUpdated?: () => void;
};

const READINESS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default",
  partial: "secondary",
  procurement_pending: "outline",
  shortage: "destructive",
};

export function ProductionSchedule({
  orders,
  canReorder = false,
  onScheduleUpdated,
}: Props) {
  const [editing, setEditing] = useState<ScheduleOrder | null>(null);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [saving, setSaving] = useState(false);

  function openSchedule(order: ScheduleOrder) {
    setEditing(order);
    setScheduledStart(order.scheduled_start ?? "");
    setScheduledEnd(order.scheduled_end ?? "");
  }

  async function handleSaveSchedule() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateProductionSchedule(editing.id, {
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
      });
      toast.success("Schedule updated");
      setEditing(null);
      onScheduleUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">FIFO Production Queue</h3>
        <Button variant="outline" size="sm" asChild>
          <Link href="/production/orders">View all orders</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {orders.length === 0 && (
          <p className="text-sm text-muted-foreground">No active production orders.</p>
        )}
        {orders.map((order) => {
          const progress = stageProgressPercent(order.current_stage);
          const readiness = order.material_readiness;

          return (
            <Card key={order.id} className="border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base font-semibold">
                        {order.project_name ?? `Project #${order.project_id}`}
                      </CardTitle>
                      <Badge variant="outline">FIFO #{order.fifo_position}</Badge>
                      {readiness && (
                        <Badge variant={READINESS_VARIANT[readiness.label] ?? "outline"}>
                          {materialReadinessLabel(readiness.label)}
                        </Badge>
                      )}
                      {order.glass_status?.status && (
                        <Badge variant="outline">
                          Glass: {order.glass_status.status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.reference} · {formatProductionStage(order.current_stage)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canReorder && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit schedule dates"
                        onClick={() => openSchedule(order)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/production/orders/${order.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Status: {order.status.replace(/_/g, " ")}</span>
                  {order.project_stage && (
                    <span>PM stage: {order.project_stage.replace(/_/g, " ")}</span>
                  )}
                  {order.scheduled_start && (
                    <span>
                      Scheduled: {order.scheduled_start}
                      {order.scheduled_end ? ` → ${order.scheduled_end}` : ""}
                    </span>
                  )}
                </div>
                {(order.teams?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {order.teams!.map((team) => (
                      <Badge key={team.id} variant="secondary" className="text-xs font-normal">
                        {team.user?.name ?? `#${team.user_id}`} · {team.stage.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Pipeline progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update schedule dates</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            FIFO position #{editing?.fifo_position} is read-only and comes from warehouse reservations.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Scheduled start</Label>
              <Input
                type="date"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Scheduled end</Label>
              <Input
                type="date"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSchedule} disabled={saving}>
              Save schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
