"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionOrdersTable } from "@/components/production/production-orders-table";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  ASSEMBLY_STAGES,
  listProductionSchedule,
  type ProductionOrder,
  type ScheduleOrder,
} from "@/lib/api/production";
import { loadOrdersForStages } from "@/lib/production/load-queue-orders";
import { isProductionManager } from "@/lib/production/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProductionAssemblyPage() {
  const { can } = usePermissions();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [scheduleByOrderId, setScheduleByOrderId] = useState<
    Record<number, ScheduleOrder["glass_status"]>
  >({});
  const [loading, setLoading] = useState(true);
  const manager = isProductionManager(can);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      loadOrdersForStages(ASSEMBLY_STAGES, {
        per_page: 50,
        assigned_to_me: !manager,
      }),
      listProductionSchedule(),
    ])
      .then(([queueOrders, scheduleRes]) => {
        setOrders(queueOrders);
        const glassMap: Record<number, ScheduleOrder["glass_status"]> = {};
        for (const row of scheduleRes.data) {
          glassMap[row.id] = row.glass_status ?? null;
        }
        setScheduleByOrderId(glassMap);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Failed to load assembly queue")))
      .finally(() => setLoading(false));
  }, [manager]);

  useEffect(() => {
    load();
  }, [load]);

  const glassLabels = useMemo(
    () =>
      orders
        .map((order) => {
          const glass = scheduleByOrderId[order.id];
          if (!glass?.status) return null;
          return { order, glass };
        })
        .filter(Boolean) as {
        order: ProductionOrder;
        glass: NonNullable<ScheduleOrder["glass_status"]>;
      }[],
    [orders, scheduleByOrderId],
  );

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Assembly Queue"
        subtitle={
          manager
            ? "Fabrication through post-fabrication QC (server-filtered by stage)"
            : "Orders assigned to you in assembly stages"
        }
      />
      <div className="space-y-4 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {glassLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {glassLabels.map(({ order, glass }) => (
                  <span key={order.id}>
                    {order.reference}:{" "}
                    <Badge variant="outline">
                      {(glass.order_number ? `${glass.order_number} · ` : "") +
                        glass.status.replace(/_/g, " ")}
                    </Badge>
                  </span>
                ))}
              </div>
            )}
            <ProductionOrdersTable orders={orders} />
          </>
        )}
      </div>
    </div>
  );
}
