"use client";

import { SiteVisitsPageView } from "../../../crm/site-visits/page";
import { siteOpsMyVisitsPath, siteOpsTodayPath } from "@/lib/site-ops/paths";

export default function ProductionSiteVisitsPage() {
  return (
    <SiteVisitsPageView
      measurementContext="production"
      myVisitsPath={siteOpsMyVisitsPath("production")}
      todayPath={siteOpsTodayPath("production")}
      visitDetailBasePath="/site-ops/visits"
      allowSchedule={false}
    />
  );
}
