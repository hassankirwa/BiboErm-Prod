"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Boxes, PackageSearch, RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProcurementStockOverview,
  type ProcurementStockItem,
  type ProcurementStockOverview,
} from "@/lib/api/procurement";
import {
  formatQuantity,
  stockCategoryClassName,
  stockStatusClassName,
  stockStatusLabel,
} from "@/lib/procurement-stock";
import { toast } from "sonner";
import { MaterialCodeSearch } from "@/components/warehouse/material-code-search";

type StockStatusFilter = "all" | ProcurementStockItem["stock_status"];

export default function ProcurementStockPage() {
  const [overview, setOverview] = useState<ProcurementStockOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StockStatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);

    getProcurementStockOverview({
      page,
      per_page: 100,
      search: search || undefined,
      category: category === "all" ? undefined : category,
      stock_status: status === "all" ? undefined : status,
    })
      .then((response) => setOverview(response.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load procurement stock.");
      })
      .finally(() => setLoading(false));
  }, [category, page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => overview?.categories.map((item) => item.label).sort((left, right) => left.localeCompare(right)) ?? [],
    [overview],
  );

  const filteredItems = overview?.items ?? [];
  const meta = overview?.meta ?? { current_page: 1, last_page: 1, per_page: 100, total: 0 };

  const filteredAlerts = useMemo(() => {
    const alerts = overview?.alerts ?? [];
    const searchTerm = search.trim().toLowerCase();

    return alerts
      .filter((item) => {
        const matchesSearch =
          searchTerm.length === 0 ||
          item.name.toLowerCase().includes(searchTerm) ||
          item.sku.toLowerCase().includes(searchTerm);
        const matchesCategory = category === "all" || item.category_label === category;
        const matchesStatus = status === "all" || item.stock_status === status;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort(
        (left, right) =>
          Number.parseFloat(right.shortage_qty ?? "0") - Number.parseFloat(left.shortage_qty ?? "0"),
      );
  }, [category, overview, search, status]);

  const summary = overview?.summary;
  const categoryCoverage = overview?.categories ?? [];

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Procurement Stock"
        subtitle="Track material availability, category coverage, and low-stock risk for procurement."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/inventory">Warehouse View</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/procurement/stock-analytics">Open Analytics</Link>
            </Button>
          </div>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{summary?.total_materials ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Materials tracked</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-blue-500/10 p-2 text-blue-600">
                  <PackageSearch className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{summary?.categories_count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Categories covered</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{summary?.in_stock_items ?? 0}</p>
                  <p className="text-xs text-muted-foreground">In stock</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-amber-500/10 p-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{summary?.alert_items ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Low-stock alerts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-slate-500/10 p-2 text-slate-700 dark:text-slate-300">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {summary ? summary.total_available_qty.toFixed(3) : "0.000"}
                  </p>
                  <p className="text-xs text-muted-foreground">Total available qty</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by material or SKU"
                  className="max-w-sm"
                />
                <div className="w-full max-w-sm">
                  <MaterialCodeSearch
                    value={searchInput}
                    placeholder="Find by code"
                    onSelect={(item) => {
                      setSearchInput(item.sku);
                      setSearch(item.sku);
                      setPage(1);
                    }}
                  />
                </div>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as StockStatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh stock data">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Low-Stock Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? <p className="text-sm text-muted-foreground">Checking alert thresholds...</p> : null}
                  {!loading && filteredAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No low-stock alerts for the current filters.</p>
                  ) : null}
                  {!loading
                    ? filteredAlerts.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.sku} {"\u00b7"} {item.category_label}
                              </p>
                            </div>
                            <Badge variant="secondary" className={stockStatusClassName(item.stock_status)}>
                              {stockStatusLabel(item.stock_status)}
                            </Badge>
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            <p>
                              Available:{" "}
                              <span className="font-medium text-foreground">
                                {formatQuantity(item.quantity_available, item.unit_of_measure)}
                              </span>
                            </p>
                            <p>
                              Minimum:{" "}
                              <span className="font-medium text-foreground">
                                {formatQuantity(item.min_stock_qty, item.unit_of_measure)}
                              </span>
                            </p>
                            <p>
                              Short by:{" "}
                              <span className="font-medium text-destructive">
                                {formatQuantity(item.shortage_qty ?? "0", item.unit_of_measure)}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))
                    : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? <p className="text-sm text-muted-foreground">Loading category coverage...</p> : null}
                  {!loading && categoryCoverage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No category coverage available.</p>
                  ) : null}
                  {!loading
                    ? categoryCoverage.map((group) => (
                        <div key={group.label} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{group.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {group.materials_count} materials {"\u00b7"} {group.alert_items} alerts
                              </p>
                            </div>
                            <p className="text-sm font-semibold">{group.quantity_available.toFixed(3)}</p>
                          </div>
                        </div>
                      ))
                    : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Materials</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading procurement stock...</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">On Hand</TableHead>
                          <TableHead className="text-right">Reserved</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead className="text-right" title="Document reference total from catalog import">
                            Doc ref
                          </TableHead>
                          <TableHead className="text-right">Min</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.sku} {"\u00b7"} {item.locations_count} location{item.locations_count === 1 ? "" : "s"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={stockCategoryClassName(item.category_label)}>
                                {item.category_label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatQuantity(item.quantity_on_hand, item.unit_of_measure)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatQuantity(item.quantity_reserved, item.unit_of_measure)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatQuantity(item.quantity_available, item.unit_of_measure)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.reference_total_qty != null
                                ? formatQuantity(item.reference_total_qty, item.unit_of_measure)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatQuantity(item.min_stock_qty, item.unit_of_measure)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={stockStatusClassName(item.stock_status)}>
                                {stockStatusLabel(item.stock_status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                              No materials match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {(meta.last_page ?? 1) > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Page {meta.current_page ?? page} of {meta.last_page ?? 1} · {meta.total ?? 0} materials
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= (meta.last_page ?? 1) || loading}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
