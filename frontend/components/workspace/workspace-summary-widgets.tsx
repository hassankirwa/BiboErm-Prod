import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar } from "lucide-react";

function ProductionDonut() {
  return (
    <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray="72 28"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <span className="text-xs font-bold text-foreground">72%</span>
        <span className="block text-[9px] text-muted-foreground">Capacity</span>
      </div>
    </div>
  );
}

function WidgetCardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      <Link
        href={href}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        {linkLabel}
      </Link>
    </CardHeader>
  );
}

export function WorkspaceSummaryWidgets() {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader title="Today's Overview" href="/analytics" linkLabel="View report" />
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Active Jobs</p>
            <p className="text-lg font-semibold">8</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Today</p>
            <p className="text-lg font-semibold">4</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Delays</p>
            <p className="text-lg font-semibold text-primary">2</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">On-Time</p>
            <p className="text-lg font-semibold text-green-600">92%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader
          title="Production Status"
          href="/production/schedule"
          linkLabel="View shop floor"
        />
        <CardContent className="flex flex-col items-start gap-4 px-4 pb-4 min-[400px]:flex-row min-[400px]:items-center">
          <ProductionDonut />
          <ul className="min-w-0 w-full space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">
                In Progress <span className="font-semibold text-foreground">(18)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                Completed <span className="font-semibold text-foreground">(26)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300" />
              <span className="text-muted-foreground">
                Planned <span className="font-semibold text-foreground">(11)</span>
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader
          title="Inventory Alerts"
          href="/warehouse/inventory"
          linkLabel="View all"
        />
        <CardContent className="space-y-3 px-4 pb-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="min-w-0">3 Low Stock Items</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">2 Critical Items</span>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full rounded-[10px] border-border/60 shadow-sm">
        <WidgetCardHeader title="Field Day" href="/crm/field-day" linkLabel="Open field day" />
        <CardContent className="space-y-3 px-4 pb-4 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span className="min-w-0">Log GPS pins and convert to leads</span>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span className="min-w-0">Review field officer routes</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
