"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ActivitiesWorkspace } from "@/components/crm/activities-workspace";
import { AssignedOpenVisitsView } from "@/components/crm/assigned-open-visits-view";
import { FieldDayWorkspace } from "@/components/crm/field-day-workspace";
import { SiteVisitHistoryView } from "@/components/crm/site-visit-history-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";

const TAB_VALUES = [
  "activities",
  "site-visits",
  "visit-history",
  "field-day",
] as const;
type ActivitiesHubTab = (typeof TAB_VALUES)[number];

function isActivitiesHubTab(value: string | null): value is ActivitiesHubTab {
  return TAB_VALUES.includes(value as ActivitiesHubTab);
}

export function CrmActivitiesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canViewSiteVisits = can("site_visits.view") || can("site_visits.execute");
  const canViewFieldDay = can("field_day.view");

  const requestedTab = searchParams.get("tab");
  let activeTab: ActivitiesHubTab = "activities";
  if (requestedTab === "site-visits" && canViewSiteVisits) {
    activeTab = "site-visits";
  } else if (requestedTab === "visit-history" && canViewSiteVisits) {
    activeTab = "visit-history";
  } else if (requestedTab === "field-day" && canViewFieldDay) {
    activeTab = "field-day";
  } else if (requestedTab === "activities") {
    activeTab = "activities";
  }

  function setTab(next: string) {
    if (!isActivitiesHubTab(next)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "activities") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `/crm/activities?${qs}` : "/crm/activities");
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activities</h1>
        <p className="text-sm text-muted-foreground">
          Log CRM tasks, work assigned measurement visits, and run field day.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          {canViewSiteVisits ? (
            <TabsTrigger value="site-visits">My Site Visits</TabsTrigger>
          ) : null}
          {canViewSiteVisits ? (
            <TabsTrigger value="visit-history">Visit History</TabsTrigger>
          ) : null}
          {canViewFieldDay ? (
            <TabsTrigger value="field-day">Field Day</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="activities" className="mt-0">
          <ActivitiesWorkspace typeFilter="all" hidePageHeader />
        </TabsContent>

        {canViewSiteVisits ? (
          <TabsContent value="site-visits" className="mt-0">
            <AssignedOpenVisitsView
              workspace="user"
              embedded
              todayPath="/site-visits/today"
              backPath="/crm/activities"
              title="My site visits"
              subtitle="Open quotation and production measurement visits assigned to you."
            />
          </TabsContent>
        ) : null}

        {canViewSiteVisits ? (
          <TabsContent value="visit-history" className="mt-0">
            <SiteVisitHistoryView />
          </TabsContent>
        ) : null}

        {canViewFieldDay ? (
          <TabsContent value="field-day" className="mt-0">
            <FieldDayWorkspace embedded />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
