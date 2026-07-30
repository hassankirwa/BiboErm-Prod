"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Layers,
  RefreshCw,
  Ruler,
  TrendingUp,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getGlassPriceAnalytics,
  type GlassPriceAnalytics,
} from "@/lib/api/procurement";
import { formatKes, formatPricePerSqm } from "@/lib/procurement/glass-pricing";
import { toast } from "sonner";

const TREND_COLORS = ["#0f766e", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function GlassPriceAnalyticsPage() {
  const [analytics, setAnalytics] = useState<GlassPriceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getGlassPriceAnalytics()
      .then((response) => setAnalytics(response.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load glass price analytics.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = analytics?.summary;
  const spendChange = summary?.spend_change_pct;

  const trendChartData = useMemo(() => {
    const trends = analytics?.price_trends ?? [];
    const months = Array.from(new Set(trends.map((row) => row.month))).sort();
    const types = Array.from(new Set(trends.map((row) => row.glass_type)));

    return months.map((month) => {
      const label = trends.find((row) => row.month === month)?.label ?? month;
      const point: Record<string, string | number> = { month, label };
      types.forEach((type) => {
        const match = trends.find((row) => row.month === month && row.glass_type === type);
        if (match) point[type] = match.avg_price_per_sqm;
      });
      return point;
    });
  }, [analytics?.price_trends]);

  const trendTypes = useMemo(
    () => Array.from(new Set((analytics?.price_trends ?? []).map((row) => row.glass_type))),
    [analytics?.price_trends],
  );

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Glass Price Projection"
        subtitle="Track buying price per glass type per m², monthly glass spend, and market movement from receivals."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/procurement/dashboard">Dashboard</Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={load}
              disabled={loading}
              aria-label="Refresh analytics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CircleDollarSign className="h-4 w-4" />}
              label="Spend this month"
              value={formatKes(summary?.this_month_spend ?? 0)}
              tone="primary"
              hint={
                spendChange == null
                  ? "No prior month baseline"
                  : `${spendChange >= 0 ? "+" : ""}${spendChange}% vs last month`
              }
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Avg price / m²"
              value={formatPricePerSqm(summary?.avg_price_per_sqm)}
              tone="success"
            />
            <MetricCard
              icon={<Ruler className="h-4 w-4" />}
              label="Area received"
              value={`${(summary?.total_area_m2 ?? 0).toFixed(2)} m²`}
              tone="primary"
            />
            <MetricCard
              icon={<Layers className="h-4 w-4" />}
              label="Price observations"
              value={summary?.records_count ?? 0}
              tone="warning"
              hint={`${summary?.deliveries_count ?? 0} deliveries in range`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Monthly glass spend</CardTitle>
              </CardHeader>
              <CardContent className="h-[340px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading chart…</p>
                ) : (analytics?.monthly_spend ?? []).every((row) => row.spend === 0) ? (
                  <p className="text-sm text-muted-foreground">
                    No delivered glass with buying prices yet. Record prices when marking glass
                    orders delivered.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics?.monthly_spend ?? []}
                      margin={{ left: 8, right: 16, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value) => formatKes(Number(value))}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar dataKey="spend" name="Spend (KES)" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price change by glass type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analytics?.price_by_type ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No glass type pricing yet.</p>
                ) : (
                  (analytics?.price_by_type ?? []).map((row) => (
                    <div
                      key={row.glass_type}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{row.glass_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.records} receivals · {row.total_area_m2.toFixed(3)} m² ·{" "}
                          {formatKes(row.total_spend)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          Avg {formatPricePerSqm(row.avg_price_per_sqm)}
                        </Badge>
                        <Badge variant="secondary">
                          Latest {formatPricePerSqm(row.latest_price_per_sqm)}
                        </Badge>
                        <ChangeBadge changePct={row.change_pct} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Price projection by type (KES / m²)</CardTitle>
            </CardHeader>
            <CardContent className="h-[360px]">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading chart…</p>
              ) : trendChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Price trends appear after multiple deliveries across glass types.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatKes(Number(value))} />
                    <Legend />
                    {trendTypes.map((type, index) => (
                      <Line
                        key={type}
                        type="monotone"
                        dataKey={type}
                        name={type}
                        stroke={TREND_COLORS[index % TREND_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent receival prices</CardTitle>
            </CardHeader>
            <CardContent>
              {(analytics?.recent_records ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No price records yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Area</TableHead>
                      <TableHead className="text-right">Buying price</TableHead>
                      <TableHead className="text-right">KES / m²</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analytics?.recent_records ?? []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {row.recorded_at
                            ? new Date(row.recorded_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/procurement/glass-orders/${row.glass_order_id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {row.order_number ?? `#${row.glass_order_id}`}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {row.supplier?.name ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{row.glass_type || "Unspecified"}</p>
                          <p className="text-xs text-muted-foreground">{row.tint || "—"}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.width_mm} × {row.height_mm} mm · qty {row.quantity}
                        </TableCell>
                        <TableCell className="text-right">{row.area_m2.toFixed(4)} m²</TableCell>
                        <TableCell className="text-right">{formatKes(row.buying_price)}</TableCell>
                        <TableCell className="text-right">{formatPricePerSqm(row.price_per_sqm)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct == null) {
    return <Badge variant="outline">No prior point</Badge>;
  }
  const up = changePct >= 0;
  return (
    <Badge
      variant="secondary"
      className={up ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}
    >
      {up ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
      {up ? "+" : ""}
      {changePct}%
    </Badge>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "warning" | "danger" | "success";
  hint?: string;
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
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
