"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionOrdersTable } from "@/components/production/production-orders-table";
import { usePermissions } from "@/hooks/use-permissions";
import { listProductionOrders, type ProductionOrder } from "@/lib/api/production";
import { isCuttingQueueOrder, isProductionManager } from "@/lib/production/utils";
import { toast } from "sonner";

export default function ProductionCuttingPage() {
  const { can } = usePermissions();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const manager = isProductionManager(can);

  const load = useCallback(() => {
    setLoading(true);
    listProductionOrders({
      per_page: 100,
      assigned_to_me: !manager,
    })
      .then((res) => setOrders(res.data))
      .catch((e: Error) => toast.error(e.message || "Failed to load cutting queue"))
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
          isCuttingQueueOrder(o),
      ),
    [orders],
  );

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Cutting Queue"
        subtitle={
          manager
            ? "Material prep, QC pre-check, and cutting stages"
            : "Orders assigned to you in cutting stages"
        }
      />
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ProductionOrdersTable orders={queue} />
        )}
      </div>
    </div>
  );
}
