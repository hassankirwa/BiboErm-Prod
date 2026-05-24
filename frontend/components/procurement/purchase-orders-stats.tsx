import { Card, CardContent } from "@/components/ui/card";
import { mockPurchaseOrders } from "@/lib/data/procurement";
import { FileText, Clock, CheckCircle, Truck } from "lucide-react";

const totalOrders = mockPurchaseOrders.length;
const pendingOrders = mockPurchaseOrders.filter(
  (po) => po.status === "pending_approval" || po.status === "draft"
);
const approvedOrders = mockPurchaseOrders.filter(
  (po) => po.status === "approved" || po.status === "sent"
);
const totalValue = mockPurchaseOrders.reduce((acc, po) => acc + po.totalAmount, 0);

const stats = [
  {
    label: "Total Orders",
    value: totalOrders,
    subtext: "This month",
    icon: FileText,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Pending Approval",
    value: pendingOrders.length,
    subtext: "Awaiting review",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    label: "In Transit",
    value: approvedOrders.length,
    subtext: "Expected soon",
    icon: Truck,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    label: "Total Value",
    value: `KES ${(totalValue / 1000).toFixed(0)}K`,
    subtext: "All POs",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function PurchaseOrdersStats() {
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
