import { Card, CardContent } from "@/components/ui/card";
import type { CatalogInventoryItem } from "@/lib/api/warehouse";
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export function InventoryStats({ items }: { items: CatalogInventoryItem[] }) {
  const totalItems = items.length;
  const lowStockItems = items.filter(
    (item) =>
      item.stock_status === "low_stock" ||
      Number(item.quantity_available) < Number(item.min_stock_qty ?? 0),
  );
  const totalReserved = items.reduce(
    (acc, item) => acc + Number(item.quantity_reserved),
    0,
  );
  const totalAvailable = items.reduce(
    (acc, item) => acc + Number(item.quantity_available),
    0,
  );

  const stats = [
    {
      label: "Total Items",
      value: totalItems,
      subtext: "Catalog materials",
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Low Stock",
      value: lowStockItems.length,
      subtext: "Need restock",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Reserved",
      value: totalReserved.toFixed(3),
      subtext: "For projects",
      icon: ArrowDownToLine,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Available",
      value: totalAvailable.toFixed(3),
      subtext: "Ready to use",
      icon: ArrowUpFromLine,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{stat.subtext}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
