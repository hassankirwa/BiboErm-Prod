"use client";

import { AssignedOpenVisitsView } from "@/components/crm/assigned-open-visits-view";
import { siteOpsTodayPath, siteOpsVisitsPath } from "@/lib/site-ops/paths";

export default function QuotationMyVisitsPage() {
  return (
    <AssignedOpenVisitsView
      workspace="crm"
      measurementContext="quotation"
      backPath={siteOpsVisitsPath("quotation")}
      backLabel="Quotation visits"
      todayPath={siteOpsTodayPath("quotation")}
    />
  );
}
