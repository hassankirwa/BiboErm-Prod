"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/errors";
import { listPurchaseOrders } from "@/lib/api/procurement";
import { CheckCircle, Clock, FileText, Truck } from "lucide-react";

export function PurchaseOrdersStats() {
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listPurchaseOrders({ per_page: 500 })
      .then((res) => {
        if (cancelled) return;

        const orders = res.data;
        const totalValue = orders.reduce(
          (acc, po) => acc + Number.parseFloat(po.total || "0"),
          0,
        );

        setCounts({
          total: res.meta?.total ?? orders.length,
          pending: orders.filter(
            (po) => po.status === "pending_approval" || po.status === "draft",
          ).length,
          inTransit: orders.filter(
            (po) => po.status === "sent" || po.status === "partial_received",
          ).length,
          totalValue,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load stats.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    {
      label: "Total Orders",
      value: counts.total,
      subtext: "This month",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Pending Approval",
      value: counts.pending,
      subtext: "Awaiting review",
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "In Transit",
      value: counts.inTransit,
      subtext: "Expected soon",
      icon: Truck,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Total Value",
      value: `KES ${(counts.totalValue / 1000).toFixed(0)}K`,
      subtext: "All POs",
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-md p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {stat.subtext}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
