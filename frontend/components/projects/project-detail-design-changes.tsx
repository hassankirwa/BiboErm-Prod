"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveDesignChangeOrder,
  closeDesignChangeOrder,
  createDesignChangeRemake,
  listDesignChangeOrders,
  type DesignChangeOrder,
} from "@/lib/api/projects";
import { toast } from "sonner";

type Props = { projectId: number };

export function ProjectDetailDesignChanges({ projectId }: Props) {
  const [orders, setOrders] = useState<DesignChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const res = await listDesignChangeOrders(projectId);
    setOrders(res.data);
  }, [projectId]);

  useEffect(() => {
    reload()
      .catch((e: Error) => toast.error(e.message || "Failed to load design changes."))
      .finally(() => setLoading(false));
  }, [reload]);

  async function run(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await reload();
      toast.success("Design change order updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading design changes…</p>;
  }

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No design change orders yet. Field teams can raise one from a job when measurements do not fit.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((dco) => (
        <Card key={dco.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="text-base">DCO #{dco.id}</CardTitle>
            <Badge variant="secondary">{String(dco.status).replace(/_/g, " ")}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{dco.reason ?? "—"}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Parent PO: {dco.parent_production_order_id ?? "—"}</span>
              <span>Remake PO: {dco.remake_production_order_id ?? "—"}</span>
              <span>NC: {dco.field_non_conformity_id ?? "—"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dco.status === "drafted" || dco.status === "awaiting_remeasure" ? (
                <Button
                  size="sm"
                  disabled={busyId === dco.id}
                  onClick={() =>
                    void run(dco.id, () =>
                      approveDesignChangeOrder(dco.id, {
                        target_stage: "final_design_approval",
                      }),
                    )
                  }
                >
                  Approve & rewind
                </Button>
              ) : null}
              {!["closed", "cancelled", "drafted"].includes(String(dco.status)) &&
              !dco.remake_production_order_id ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === dco.id}
                  onClick={() => void run(dco.id, () => createDesignChangeRemake(dco.id))}
                >
                  Create remake PO
                </Button>
              ) : null}
              {dco.status !== "closed" && dco.status !== "cancelled" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === dco.id}
                  onClick={() => void run(dco.id, () => closeDesignChangeOrder(dco.id))}
                >
                  Close
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
