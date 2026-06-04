"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionSchedule } from "@/components/production/production-schedule";
import { ProductionStats } from "@/components/production/production-stats";
import { usePermissions } from "@/hooks/use-permissions";
import {
  listProductionOrders,
  listProductionSchedule,
  type ProductionOrder,
  type ScheduleOrder,
} from "@/lib/api/production";
import { getApiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

export default function ProductionSchedulePage() {
  const { can } = usePermissions();
  const [schedule, setSchedule] = useState<ScheduleOrder[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const canReorder = can("production.schedule.manage");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      listProductionSchedule(),
      listProductionOrders({ per_page: 100 }),
    ])
      .then(([schedRes, ordersRes]) => {
        setSchedule(schedRes.data);
        setOrders(ordersRes.data);
      })
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load production schedule")),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Production Schedule"
        subtitle="FIFO queue — orders are created when warehouse materials are ready"
      />
      <div className="min-w-0 w-full space-y-6 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : (
          <>
            <ProductionStats orders={orders} />
            <ProductionSchedule
              orders={schedule}
              canReorder={canReorder}
              onScheduleUpdated={load}
            />
          </>
        )}
      </div>
    </div>
  );
}
