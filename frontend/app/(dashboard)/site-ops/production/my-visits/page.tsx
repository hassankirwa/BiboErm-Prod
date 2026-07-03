"use client";

import { AssignedOpenVisitsView } from "@/components/crm/assigned-open-visits-view";
import { siteOpsTodayPath, siteOpsVisitsPath } from "@/lib/site-ops/paths";

export default function ProductionMyVisitsPage() {
  return (
    <AssignedOpenVisitsView
      workspace="crm"
      measurementContext="production"
      backPath={siteOpsVisitsPath("production")}
      backLabel="Production visits"
      todayPath={siteOpsTodayPath("production")}
    />
  );
}
