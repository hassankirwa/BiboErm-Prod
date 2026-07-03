"use client";

import { SiteVisitsPageView } from "../../../crm/site-visits/page";
import {
  SITE_OPS_FIELD_DAY_PATH,
  siteOpsMyVisitsPath,
  siteOpsTodayPath,
} from "@/lib/site-ops/paths";

export default function QuotationSiteVisitsPage() {
  return (
    <SiteVisitsPageView
      measurementContext="quotation"
      myVisitsPath={siteOpsMyVisitsPath("quotation")}
      todayPath={siteOpsTodayPath("quotation")}
      fieldDayPath={SITE_OPS_FIELD_DAY_PATH}
      visitDetailBasePath="/site-ops/visits"
    />
  );
}
