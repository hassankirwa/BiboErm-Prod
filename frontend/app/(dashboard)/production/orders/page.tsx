"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProductionOrdersTable } from "@/components/production/production-orders-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  listProductionOrders,
  type ProductionOrder,
} from "@/lib/api/production";
import { isProductionManager } from "@/lib/production/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];

export default function ProductionOrdersPage() {
  const { can } = usePermissions();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const manager = isProductionManager(can);

  const load = useCallback(() => {
    setLoading(true);
    listProductionOrders({
      per_page: 25,
      page,
      assigned_to_me: !manager,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
      .then((res) => {
        setOrders(res.data);
        setLastPage(res.meta?.last_page ?? 1);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Failed to load orders")))
      .finally(() => setLoading(false));
  }, [manager, page, statusFilter]);

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
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        ) : (
          <>
            <ProductionOrdersTable orders={orders} />
            {lastPage > 1 && (
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-primary disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="text-muted-foreground">
                  Page {page} of {lastPage}
                </span>
                <button
                  type="button"
                  className="text-primary disabled:opacity-50"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
