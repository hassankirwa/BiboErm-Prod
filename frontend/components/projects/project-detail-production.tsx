"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import { listProductionOrders, type ProductionOrder } from "@/lib/api/production";
import { formatProjectStage } from "@/lib/api/projects";
import { getApiErrorMessage } from "@/lib/api/errors";
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
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load production orders")),
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  const active = orders.find(
    (o) => o.status === "scheduled" || o.status === "in_progress" || o.status === "on_hold",
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
            <p className="capitalize text-muted-foreground">Status: {active.status.replace(/_/g, " ")}</p>
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

      {orders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Production orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/production/schedule">FIFO schedule</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2"
                >
                  <Link
                    href={`/production/orders/${order.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.reference}
                  </Link>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ProductionStageBadge stage={order.current_stage} />
                    <span className="capitalize">{order.status.replace(/_/g, " ")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
