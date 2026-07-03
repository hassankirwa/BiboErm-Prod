"use client";

import { SiteVisitsTodayPageView } from "../../../crm/site-visits/today/page";
import { siteOpsMyVisitsPath, siteOpsVisitsPath } from "@/lib/site-ops/paths";

export default function QuotationTodayPage() {
  return (
    <SiteVisitsTodayPageView
      measurementContext="quotation"
      myVisitsPath={siteOpsMyVisitsPath("quotation")}
      allVisitsPath={siteOpsVisitsPath("quotation")}
      visitDetailBasePath="/site-ops/visits"
    />
  );
}
