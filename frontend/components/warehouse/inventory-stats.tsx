import { Card, CardContent } from "@/components/ui/card";
import { mockWarehouseItems } from "@/lib/mock-data";
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const totalItems = mockWarehouseItems.length;
const lowStockItems = mockWarehouseItems.filter(
  (item) => item.currentStock - item.reservedStock < item.minStock
);
const totalReserved = mockWarehouseItems.reduce((acc, item) => acc + item.reservedStock, 0);
const totalAvailable = mockWarehouseItems.reduce(
  (acc, item) => acc + (item.currentStock - item.reservedStock),
  0
);

const stats = [
  {
    label: "Total Items",
    value: totalItems,
    subtext: "In catalog",
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
    value: totalReserved,
    subtext: "For projects",
    icon: ArrowDownToLine,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    label: "Available",
    value: totalAvailable,
    subtext: "Ready to use",
    icon: ArrowUpFromLine,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function InventoryStats() {
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
