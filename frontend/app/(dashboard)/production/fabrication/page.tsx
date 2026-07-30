"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionOrdersTable } from "@/components/production/production-orders-table";
import { getApiErrorMessage } from "@/lib/api/errors";
import { FABRICATION_STAGES, type ProductionOrder } from "@/lib/api/production";
import { loadOrdersForStages } from "@/lib/production/load-queue-orders";
import { isProductionManager } from "@/lib/production/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

export default function ProductionFabricationPage() {
  const { can } = usePermissions();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const manager = isProductionManager(can);

  const load = useCallback(() => {
    setLoading(true);
    loadOrdersForStages(FABRICATION_STAGES, {
      per_page: 50,
      assigned_to_me: !manager,
    })
      .then(setOrders)
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load fabrication queue")),
      )
      .finally(() => setLoading(false));
  }, [manager]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Fabrication Queue"
        subtitle={
          manager
            ? "Frame fabrication and sash (server-filtered by stage)"
            : "Orders assigned to you in fabrication stages"
        }
      />
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ProductionOrdersTable orders={orders} />
        )}
      </div>
    </div>
  );
}
