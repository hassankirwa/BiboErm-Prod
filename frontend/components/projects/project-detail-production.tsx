"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import { listProductionOrders, type ProductionOrder } from "@/lib/api/production";
import { formatProjectStage } from "@/lib/api/projects";
import { toast } from "sonner";

type Props = {
  projectId: number;
  projectStage: string;
};

export function ProjectDetailProduction({ projectId, projectStage }: Props) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProductionOrders({ project_id: projectId, per_page: 10 })
      .then((res) => setOrders(res.data))
      .catch((e: Error) => toast.error(e.message || "Failed to load production orders"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const active = orders.find(
    (o) => o.status === "scheduled" || o.status === "in_progress",
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project stage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          PM stage: <span className="text-foreground">{formatProjectStage(projectStage)}</span>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading production data…</p>
      ) : active ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active production order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-medium">{active.reference}</span> · FIFO #
              {active.fifo_position}
            </p>
            <p>
              Pipeline: <ProductionStageBadge stage={active.current_stage} />
            </p>
            <Button size="sm" asChild>
              <Link href={`/production/orders/${active.id}`}>Open order</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active production order. Orders are created automatically when warehouse
          marks materials ready.
        </p>
      )}

      {orders.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {orders.length} production order(s) on record for this project.
        </p>
      )}
    </div>
  );
}
