"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionOrdersTable } from "@/components/production/production-orders-table";
import { usePermissions } from "@/hooks/use-permissions";
import { listProductionOrders, type ProductionOrder } from "@/lib/api/production";
import { isProductionManager } from "@/lib/production/utils";
import { toast } from "sonner";

export default function ProductionOrdersPage() {
  const { can } = usePermissions();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const manager = isProductionManager(can);

  const load = useCallback(() => {
    setLoading(true);
    listProductionOrders({ per_page: 100, assigned_to_me: !manager })
      .then((res) => setOrders(res.data))
      .catch((e: Error) => toast.error(e.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [manager]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Production Orders"
        subtitle={
          manager
            ? "Sorted by FIFO position (warehouse reservation queue)"
            : "Orders where you are assigned to a stage"
        }
      />
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        ) : (
          <ProductionOrdersTable orders={orders} />
        )}
      </div>
    </div>
  );
}
