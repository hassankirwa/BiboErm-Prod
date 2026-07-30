"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { InventoryStats } from "@/components/warehouse/inventory-stats";
import { InventoryFilters } from "@/components/warehouse/inventory-filters";
import { InventoryTable } from "@/components/warehouse/inventory-table";
import { MaterialCodeSearch } from "@/components/warehouse/material-code-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listInventory, type CatalogInventoryItem, type CatalogTier } from "@/lib/api/warehouse";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";

const PER_PAGE = 50;

export default function InventoryPage() {
  const [items, setItems] = useState<CatalogInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [tier, setTier] = useState<CatalogTier | "all">("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: 0,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    listInventory({
      catalog_only: true,
      catalog_tier: tier === "all" ? undefined : tier,
      category: category === "all" ? undefined : category,
      search: search || undefined,
      stock_status: stockStatus === "all" ? undefined : stockStatus,
      page,
      per_page: PER_PAGE,
    })
      .then((res) => {
        setItems(res.data as CatalogInventoryItem[]);
        if (res.meta) {
          setMeta({
            current_page: res.meta.current_page ?? page,
            last_page: res.meta.last_page ?? 1,
            per_page: res.meta.per_page ?? PER_PAGE,
            total: res.meta.total ?? res.data.length,
          });
        }
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load inventory."))
      .finally(() => setLoading(false));
  }, [category, tier, stockStatus, search, page]);

  const groupedByCategory = (() => {
    const groups: Record<string, CatalogInventoryItem[]> = {
      aluminium_profile: [],
      accessory: [],
      rubber: [],
      other: [],
    };
    for (const item of items) {
      const key = item.category ?? "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  })();

  const exportStockReport = () => {
    const rows = items.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      tier: item.catalog_tier ?? "",
      description: item.description ?? "",
      on_hand: item.quantity_on_hand,
      reserved: item.quantity_reserved,
      available: item.quantity_available,
      min_stock: item.min_stock_qty,
    }));

    const csv = [
      [
        "SKU",
        "Name",
        "Category",
        "Tier",
        "Description",
        "On Hand",
        "Reserved",
        "Available",
        "Min Stock",
      ].join(","),
      ...rows.map((row) =>
        [
          row.sku,
          row.name,
          row.category,
          row.tier,
          row.description,
          row.on_hand,
          row.reserved,
          row.available,
          row.min_stock,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warehouse-catalog-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const load = () => {
    setLoading(true);
    listInventory({
      catalog_only: true,
      catalog_tier: tier === "all" ? undefined : tier,
      category: category === "all" ? undefined : category,
      search: search || undefined,
      stock_status: stockStatus === "all" ? undefined : stockStatus,
      page,
      per_page: PER_PAGE,
    })
      .then((res) => {
        setItems(res.data as CatalogInventoryItem[]);
        if (res.meta) {
          setMeta({
            current_page: res.meta.current_page ?? page,
            last_page: res.meta.last_page ?? 1,
            per_page: res.meta.per_page ?? PER_PAGE,
            total: res.meta.total ?? res.data.length,
          });
        }
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load inventory."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Inventory"
        subtitle="Catalog materials with totals and per-cage location quantities"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={loading || items.length === 0}
              onClick={exportStockReport}
            >
              <Download className="h-4 w-4" />
              Stock Report
            </Button>
          </div>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <InventoryStats items={items} />
          <InventoryFilters
            search={searchInput}
            category={category}
            tier={tier}
            stockStatus={stockStatus}
            onSearchChange={(value) => {
              setSearchInput(value);
            }}
            onCategoryChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
            onTierChange={(value) => {
              setTier(value);
              setPage(1);
            }}
            onStockStatusChange={(value) => {
              setStockStatus(value);
              setPage(1);
            }}
            onRefresh={load}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Find material by code</CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialCodeSearch
                value={searchInput}
                onSelect={(item) => {
                  setSearchInput(item.sku);
                  setSearch(item.sku);
                  setPage(1);
                }}
                placeholder="Type code e.g. WP5009 or GL-95M16"
              />
            </CardContent>
          </Card>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading inventory…</p>
          ) : (
            <div className="space-y-6">
              {(["aluminium_profile", "accessory", "rubber", "other"] as const).map((group) => {
                const rows = groupedByCategory[group] ?? [];
                if (rows.length === 0) return null;
                const title =
                  group === "aluminium_profile"
                    ? "Aluminium"
                    : group === "accessory"
                      ? "Accessories"
                      : group === "rubber"
                        ? "Rubbers"
                        : "Other";

                return (
                  <div key={group} className="space-y-2">
                    <p className="text-sm font-semibold">{title}</p>
                    <InventoryTable items={rows} />
                  </div>
                );
              })}
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No catalog materials yet. Import a material catalog from Master Data.
                </p>
              ) : null}
              {meta.last_page > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {meta.current_page} of {meta.last_page} · {meta.total} materials
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.last_page || loading}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
