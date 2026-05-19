import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, PieChart } from "lucide-react";

export function WorkspaceSummaryWidgets() {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Card className="rounded-[10px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Today&apos;s Overview</CardTitle>
          <Link href="/analytics" className="text-xs text-primary hover:underline">
            View report
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Active Jobs</p>
            <p className="text-lg font-semibold">8</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due Today</p>
            <p className="text-lg font-semibold">4</p>
          </div>
          <div>
            <p className="text-muted-foreground">Delays</p>
            <p className="text-lg font-semibold text-primary">2</p>
          </div>
          <div>
            <p className="text-muted-foreground">On-Time</p>
            <p className="text-lg font-semibold text-green-600">92%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[10px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Production Status</CardTitle>
          <Link
            href="/production/schedule"
            className="text-xs text-primary hover:underline"
          >
            View shop floor
          </Link>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-primary/20">
            <PieChart className="h-8 w-8 text-primary" />
            <span className="absolute text-xs font-semibold">72%</span>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">In Progress</span> — 18
            </li>
            <li>
              <span className="font-medium text-foreground">Completed</span> — 26
            </li>
            <li>
              <span className="font-medium text-foreground">Planned</span> — 11
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="rounded-[10px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Inventory Alerts</CardTitle>
          <Link
            href="/warehouse/inventory"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>3 Low Stock Items</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span>2 Critical Items</span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[10px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Calendar</CardTitle>
          <Link href="/crm/field-day" className="text-xs text-primary hover:underline">
            View calendar
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>5 Installations This Week</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>2 Site Surveys Tomorrow</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
