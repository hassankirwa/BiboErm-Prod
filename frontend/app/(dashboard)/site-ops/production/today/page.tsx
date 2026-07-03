"use client";

import { SiteVisitsTodayPageView } from "../../../crm/site-visits/today/page";
import { siteOpsMyVisitsPath, siteOpsVisitsPath } from "@/lib/site-ops/paths";

export default function ProductionTodayPage() {
  return (
    <SiteVisitsTodayPageView
      measurementContext="production"
      myVisitsPath={siteOpsMyVisitsPath("production")}
      allVisitsPath={siteOpsVisitsPath("production")}
      visitDetailBasePath="/site-ops/visits"
    />
  );
}
