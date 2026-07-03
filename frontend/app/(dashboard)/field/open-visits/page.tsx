"use client";

import { AssignedOpenVisitsView } from "@/components/crm/assigned-open-visits-view";
import { siteOpsTodayPath } from "@/lib/site-ops/paths";

export default function FieldOpenVisitsPage() {
  return (
    <AssignedOpenVisitsView
      workspace="field"
      measurementContext="quotation"
      backPath="/field"
      backLabel="Field Home"
      todayPath={siteOpsTodayPath("quotation")}
    />
  );
}
