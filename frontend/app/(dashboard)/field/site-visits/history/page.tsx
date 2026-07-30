"use client";

import { AppHeader } from "@/components/app-header";
import { SiteVisitHistoryView } from "@/components/crm/site-visit-history-view";

export default function FieldSiteVisitHistoryPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Site visit history"
        subtitle="Review outcomes and correction notes for visits assigned to you."
      />
      <div className="flex-1 overflow-auto p-6">
        <SiteVisitHistoryView workspace="field" />
      </div>
    </div>
  );
}
