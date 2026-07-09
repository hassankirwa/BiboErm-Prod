"use client";

import type { LeadViewMode } from "@/lib/leads-list-data";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";
import { apiCardsToCalendarEvents, crmCalendarEventsToLeadEvents } from "@/lib/crm-lead-mapper";
import { fetchCrmCalendarEvents } from "@/lib/api/crm/calendar";
import {
  WorkspaceCalendarView,
  type WorkspaceCalendarRange,
} from "@/components/workspace/workspace-calendar-view";

export function LeadsCalendarView({
  returnView = "calendar",
  cards,
}: {
  returnView?: LeadViewMode;
  cards?: LeadKanbanCard[];
}) {
  const overlayEvents = cards ? apiCardsToCalendarEvents(cards) : [];

  async function fetchEvents(range: WorkspaceCalendarRange) {
    const res = await fetchCrmCalendarEvents(range);
    return crmCalendarEventsToLeadEvents(res.data ?? []);
  }

  return (
    <WorkspaceCalendarView
      returnView={returnView}
      overlayEvents={overlayEvents}
      fetchEvents={fetchEvents}
      emptyMessage="No lead activities to show. Load leads from the API or switch to another view."
    />
  );
}
