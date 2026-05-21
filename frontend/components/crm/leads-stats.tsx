import { Card, CardContent } from "@/components/ui/card";
import { mockLeads } from "@/lib/mock-data";
import { Users, UserCheck, Phone, FileText, HandshakeIcon } from "lucide-react";

const stats = [
  {
    label: "Total Leads",
    value: mockLeads.length,
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "New",
    value: mockLeads.filter((l) => l.status === "new").length,
    icon: UserCheck,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    label: "Contacted",
    value: mockLeads.filter((l) => l.status === "contacted" || l.status === "qualified").length,
    icon: Phone,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    label: "Quotation Sent",
    value: mockLeads.filter((l) => l.status === "quotation_sent").length,
    icon: FileText,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    label: "Negotiation",
    value: mockLeads.filter((l) => l.status === "negotiation").length,
    icon: HandshakeIcon,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export function LeadsStats() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
