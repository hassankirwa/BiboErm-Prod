"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, Package2, RefreshCw, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProcurementStockAnalytics,
  type ProcurementStockAnalytics,
  type ProcurementStockItem,
} from "@/lib/api/procurement";
import {
  formatQuantity,
  stockStatusClassName,
  stockStatusLabel,
} from "@/lib/procurement-stock";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  in_stock: "#10b981",
  low_stock: "#f59e0b",
  out_of_stock: "#ef4444",
};

export default function ProcurementStockAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ProcurementStockAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);

    getProcurementStockAnalytics()
      .then((response) => setAnalytics(response.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load stock analytics.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusChartData = useMemo(
    () =>
      (analytics?.status_breakdown ?? []).map((item) => ({
        ...item,
        fill: STATUS_COLORS[item.status] ?? "#64748b",
      })),
    [analytics],
  );

  const categoryChartData = useMemo(
    () =>
      (analytics?.category_distribution ?? [])
        .slice()
        .sort((left, right) => right.quantity_available - left.quantity_available)
        .map((item) => ({
          label: item.label,
          available: item.quantity_available,
          reserved: item.quantity_reserved,
        })),
    [analytics],
  );

  const summary = analytics?.summary;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Procurement Stock Analytics"
        subtitle="See category health, alert concentration, and the materials that need procurement attention most."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/procurement/stock">Back to Stock</Link>
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh analytics">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Boxes className="h-4 w-4" />}
              label="Materials tracked"
              value={summary?.total_materials ?? 0}
              tone="primary"
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Alert items"
              value={analytics?.alert_summary.total_alerts ?? 0}
              tone="warning"
            />
            <MetricCard
              icon={<Package2 className="h-4 w-4" />}
              label="Out of stock"
              value={summary?.out_of_stock_items ?? 0}
              tone="danger"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Available quantity"
              value={summary ? summary.total_available_qty.toFixed(3) : "0.000"}
              tone="success"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Available vs Reserved by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-[340px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading chart…</p>
                ) : categoryChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No category data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="available" name="Available" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reserved" name="Reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[340px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading chart…</p>
                ) : statusChartData.every((item) => item.count === 0) ? (
                  <p className="text-sm text-muted-foreground">No stock statuses available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={58}
                      >
                        {statusChartData.map((item) => (
                          <Cell key={item.status} fill={item.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {statusChartData.map((item) => (
                    <Badge key={item.status} variant="secondary" className={stockStatusClassName(item.status)}>
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsTable
              title="Urgent Reorder Candidates"
              rows={analytics?.urgent_reorder_items ?? []}
              emptyMessage="No urgent reorder items right now."
            />
            <AnalyticsTable
              title="Top Available Materials"
              rows={analytics?.top_available_items ?? []}
              emptyMessage="No available materials found."
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Category Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(analytics?.category_distribution ?? []).map((category) => (
                <div
                  key={category.label}
                  className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{category.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.materials_count} materials · {category.alert_items} alerts · {category.out_of_stock_items} out of stock
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">Available {category.quantity_available.toFixed(3)}</Badge>
                    <Badge variant="secondary">Reserved {category.quantity_reserved.toFixed(3)}</Badge>
                    <Badge variant="secondary">Low {category.low_stock_items}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "warning" | "danger" | "success";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    success: "bg-emerald-500/10 text-emerald-600",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${toneClasses[tone]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: ProcurementStockItem[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku} · {item.category_label}
                  </p>
                </div>
                <Badge variant="secondary" className={stockStatusClassName(item.stock_status)}>
                  {stockStatusLabel(item.stock_status)}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  Available:{" "}
                  <span className="font-medium text-foreground">
                    {formatQuantity(item.quantity_available, item.unit_of_measure)}
                  </span>
                </p>
                <p>
                  Reserved:{" "}
                  <span className="font-medium text-foreground">
                    {formatQuantity(item.quantity_reserved, item.unit_of_measure)}
                  </span>
                </p>
                <p>
                  Minimum:{" "}
                  <span className="font-medium text-foreground">
                    {formatQuantity(item.min_stock_qty, item.unit_of_measure)}
                  </span>
                </p>
                <p>
                  Shortage:{" "}
                  <span className="font-medium text-destructive">
                    {formatQuantity(item.shortage_qty ?? "0", item.unit_of_measure)}
                  </span>
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
