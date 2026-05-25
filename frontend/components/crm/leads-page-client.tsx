"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { LeadsViewToolbar } from "@/components/crm/leads-view-toolbar";
import { LeadsListTable } from "@/components/crm/leads-list-table";
import { LeadsKanbanView } from "@/components/crm/leads-kanban-view";
import { LeadsCalendarView } from "@/components/crm/leads-calendar-view";
import { LeadsMapView } from "@/components/crm/leads-map-view";
import type { LeadViewMode } from "@/lib/leads-list-data";
import { leadScopeFilters } from "@/lib/leads-list-data";
import { fetchLeads, createLead, updateLeadStatus } from "@/lib/api/crm/leads";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import type { LeadKanbanStageId } from "@/lib/leads-kanban-data";
import type { LeadFormValues } from "@/lib/lead-form-config";
import {
  apiLeadToKanbanCard,
  apiLeadToListRow,
} from "@/lib/crm-lead-mapper";
import { Spinner } from "@/components/ui/spinner";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";
import type { LeadListRow } from "@/lib/leads-list-data";

const validViews: LeadViewMode[] = ["list", "kanban", "calendar", "map"];

function parseView(param: string | null): LeadViewMode {
  if (param && validViews.includes(param as LeadViewMode)) {
    return param as LeadViewMode;
  }
  return "list";
}

export function LeadsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<string>(leadScopeFilters[0]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listRows, setListRows] = useState<LeadListRow[]>([]);
  const [kanbanCards, setKanbanCards] = useState<LeadKanbanCard[]>([]);
  const [total, setTotal] = useState(0);

  const view = useMemo(
    () => parseView(searchParams.get("view")),
    [searchParams],
  );

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchLeads({
        search: search || undefined,
        per_page: 200,
      });
      setListRows(res.data.map(apiLeadToListRow));
      setKanbanCards(res.data.map(apiLeadToKanbanCard));
      setTotal(res.meta?.total ?? res.data.length);
    } catch {
      setListRows([]);
      setKanbanCards([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  const handleStageChange = useCallback(
    async (leadId: string, stageId: LeadKanbanStageId) => {
      await ensureCsrfCookie();
      await updateLeadStatus(Number(leadId), stageId);
      await loadLeads();
    },
    [loadLeads],
  );

  const handleAddLead = useCallback(
    async (values: LeadFormValues) => {
      await ensureCsrfCookie();
      await createLead({
        name: values.title.trim(),
        contact_person_name: values.title.trim(),
        phone: values.phone.trim() || "0000000000",
        email: values.email.trim() || null,
        account_name: values.company.trim() || null,
        site_address: values.location.trim() || null,
        status: values.stageId,
        requirement_description: values.notes.trim() || values.title.trim(),
        need_site_visit: false,
        product_interests: values.source ? [values.source] : ["custom"],
        estimated_value: values.estimatedValue || undefined,
      });
      await loadLeads();
    },
    [loadLeads],
  );

  const handleActivitySave = useCallback(
    async (
      leadId: string,
      payload: {
        subject: string;
        description?: string;
        due_at?: string;
        activity_type?: string;
      },
    ) => {
      await ensureCsrfCookie();
      await createActivity({
        lead_id: Number(leadId),
        subject: payload.subject,
        description: payload.description,
        due_at: payload.due_at,
        activity_type: payload.activity_type,
        type: payload.activity_type,
      });
    },
    [],
  );

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const setView = useCallback(
    (next: LeadViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col gap-4",
        view === "map" && "min-h-[calc(100dvh-7rem)]",
      )}
    >
      <LeadsViewToolbar
        view={view}
        onViewChange={setView}
        scope={scope}
        onScopeChange={setScope}
        search={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <>
          {view === "list" && (
            <LeadsListTable
              search={search}
              returnView={view}
              apiRows={listRows}
              totalCount={total}
            />
          )}
          {view === "kanban" && (
            <LeadsKanbanView
              returnView={view}
              apiCards={kanbanCards}
              onStageChange={handleStageChange}
              onAddLead={handleAddLead}
              onActivitySave={handleActivitySave}
            />
          )}
          {view === "calendar" && (
            <LeadsCalendarView returnView={view} cards={kanbanCards} />
          )}
          {view === "map" && (
            <LeadsMapView
              className="min-h-0 flex-1"
              returnView={view}
              cards={kanbanCards}
            />
          )}
        </>
      )}
    </div>
  );
}
