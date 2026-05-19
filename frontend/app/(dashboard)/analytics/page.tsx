import { AppHeader } from "@/components/app-header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { ProjectsOverview } from "@/components/dashboard/projects-overview";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col">
      <AppHeader
        title="Analytics"
        subtitle="Welcome back, John"
        actions={
          <Button size="sm" className="h-8 gap-1.5 rounded-[5px]">
            <Plus className="h-4 w-4" />
            Quick Create
          </Button>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
          <DashboardOverview />
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCharts />
            <RecentActivities />
          </div>
          <ProjectsOverview />
        </div>
      </div>
    </div>
  );
}
