"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { InventoryStats } from "@/components/warehouse/inventory-stats";
import { InventoryFilters } from "@/components/warehouse/inventory-filters";
import { InventoryTable } from "@/components/warehouse/inventory-table";
import { Button } from "@/components/ui/button";
import { listInventory, type StockLevel } from "@/lib/api/warehouse";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function InventoryPage() {
  const [items, setItems] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");

  const load = () => {
    setLoading(true);
    listInventory({ per_page: 200 })
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load inventory."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search.trim().length === 0 ||
        item.item?.name.toLowerCase().includes(search.toLowerCase()) ||
        item.item?.sku.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "all" || item.item?.category === category;

      const available = Number(item.quantity_available);
      const reserved = Number(item.quantity_reserved);
      const minStock = Number(item.item?.min_stock_qty ?? 0);

      const matchesStatus =
        stockStatus === "all" ||
        (stockStatus === "low" && available < minStock) ||
        (stockStatus === "ok" && available >= minStock) ||
        (stockStatus === "reserved" && reserved > 0);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [category, items, search, stockStatus]);

  const exportStockReport = () => {
    const rows = filteredItems.map((item) => ({
      sku: item.item?.sku ?? "",
      name: item.item?.name ?? "",
      category: item.item?.category ?? "",
      deck: item.location?.deck?.name ?? "",
      section: item.location?.section?.code ?? "",
      bin: item.bin?.code ?? "",
      on_hand: item.quantity_on_hand,
      reserved: item.quantity_reserved,
      available: item.quantity_available,
      min_stock: item.item?.min_stock_qty ?? "",
    }));

    const csv = [
      ["SKU", "Name", "Category", "Deck", "Section", "Bin", "On Hand", "Reserved", "Available", "Min Stock"].join(","),
      ...rows.map((row) =>
        [
          row.sku,
          row.name,
          row.category,
          row.deck,
          row.section,
          row.bin,
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
    link.download = `warehouse-stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Inventory"
        subtitle="Manage warehouse stock"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={loading || filteredItems.length === 0}
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
          <InventoryStats items={filteredItems} />
          <InventoryFilters
            search={search}
            category={category}
            stockStatus={stockStatus}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
            onStockStatusChange={setStockStatus}
            onRefresh={load}
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading inventory…</p>
          ) : (
            <InventoryTable items={filteredItems} />
          )}
        </div>
      </div>
    </div>
  );
}
