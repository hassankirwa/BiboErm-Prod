"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ProductionOrdersTable } from "@/components/production/production-orders-table";
import { usePermissions } from "@/hooks/use-permissions";
import { listProductionOrders, type ProductionOrder } from "@/lib/api/production";
import { listGlassOrders } from "@/lib/api/procurement";
import { isAssemblyQueueOrder, isProductionManager } from "@/lib/production/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProductionAssemblyPage() {
  const { can } = usePermissions();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [glassByProject, setGlassByProject] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const manager = isProductionManager(can);

  const load = useCallback(() => {
    setLoading(true);
    listProductionOrders({
      per_page: 100,
      assigned_to_me: !manager,
    })
      .then(async (res) => {
        setOrders(res.data);
        const assembly = res.data.filter(
          (o) =>
            (o.status === "scheduled" || o.status === "in_progress") &&
            isAssemblyQueueOrder(o),
        );
        const glassMap: Record<number, string> = {};
        await Promise.all(
          assembly.map(async (order) => {
            try {
              const glass = await listGlassOrders({
                project_id: order.project_id,
                per_page: 1,
              });
              const row = glass.data[0];
              if (row) glassMap[order.project_id] = row.status;
            } catch {
              /* procurement read optional */
            }
          }),
        );
        setGlassByProject(glassMap);
      })
      .catch((e: Error) => toast.error(e.message || "Failed to load assembly queue"))
      .finally(() => setLoading(false));
  }, [manager]);

  useEffect(() => {
    load();
  }, [load]);

  const queue = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === "scheduled" || o.status === "in_progress") &&
          isAssemblyQueueOrder(o),
      ),
    [orders],
  );

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Assembly Queue"
        subtitle={
          manager
            ? "Fabrication through post-fabrication QC"
            : "Orders assigned to you in assembly stages"
        }
      />
      <div className="space-y-4 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {queue.some((o) => glassByProject[o.project_id]) && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {queue.map((order) => {
                  const glass = glassByProject[order.project_id];
                  if (!glass) return null;
                  return (
                    <span key={order.id}>
                      {order.reference}:{" "}
                      <Badge variant="outline">{glass.replace(/_/g, " ")}</Badge>
                    </span>
                  );
                })}
              </div>
            )}
            <ProductionOrdersTable orders={queue} />
          </>
        )}
      </div>
    </div>
  );
}
