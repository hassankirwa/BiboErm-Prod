"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { LeadsViewToolbar } from "@/components/crm/leads-view-toolbar";
import { LeadsListTable } from "@/components/crm/leads-list-table";
import { LeadsKanbanView } from "@/components/crm/leads-kanban-view";
import { LeadsCalendarView } from "@/components/crm/leads-calendar-view";
import { LeadsMapView } from "@/components/crm/leads-map-view";
import {
  leadScopeFilters,
  type LeadViewMode,
} from "@/lib/leads-list-data";
import {
  fetchLeads,
  createLead,
  updateLeadStatus,
} from "@/lib/api/crm/leads";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import {
  canKanbanMove,
  kanbanStageToStatus,
} from "@/lib/crm-lead-status";
import { leadFormToCreatePayload } from "@/lib/crm-lead-payload";
import type { LeadKanbanStageId } from "@/lib/leads-kanban-data";
import type { LeadFormValues } from "@/lib/lead-form-config";
import {
  apiLeadToKanbanCard,
  apiLeadToListRow,
} from "@/lib/crm-lead-mapper";
import { Spinner } from "@/components/ui/spinner";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";
import type { LeadListRow } from "@/lib/leads-list-data";
import type { PaginatedMeta } from "@/lib/api/crm/types";

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
  const { user } = useAuth();
  const [scope, setScope] = useState<string>(leadScopeFilters[0]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listRows, setListRows] = useState<LeadListRow[]>([]);
  const [kanbanCards, setKanbanCards] = useState<LeadKanbanCard[]>([]);
  const [total, setTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listPerPage, setListPerPage] = useState(25);
  const [paginationMeta, setPaginationMeta] = useState<PaginatedMeta | null>(
    null,
  );

  const view = useMemo(
    () => parseView(searchParams.get("view")),
    [searchParams],
  );

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const isListView = view === "list";
      const res = await fetchLeads({
        search: search || undefined,
        owner_id: scope === "My Leads" && user?.id ? user.id : undefined,
        unassigned: scope === "Unassigned" ? true : undefined,
        hot: scope === "Hot Leads" ? true : undefined,
        page: isListView ? listPage : undefined,
        per_page: isListView ? listPerPage : 200,
      });
      setListRows(res.data.map(apiLeadToListRow));
      setKanbanCards(res.data.map(apiLeadToKanbanCard));
      setPaginationMeta(res.meta ?? null);
      setTotal(res.meta?.total ?? res.data.length);
    } catch {
      setListRows([]);
      setKanbanCards([]);
      setPaginationMeta(null);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, scope, user?.id, view, listPage, listPerPage]);

  const handleStageChange = useCallback(
    async (leadId: string, stageId: LeadKanbanStageId) => {
      const card = kanbanCards.find((c) => c.id === leadId);
      const currentStatus = card?.statusKey ?? "new";
      if (!canKanbanMove(currentStatus, stageId)) {
        toast.error(
          `Cannot move lead from ${currentStatus.replace(/_/g, " ")} to ${kanbanStageToStatus(stageId).replace(/_/g, " ")}.`,
        );
        return;
      }
      const targetStatus = kanbanStageToStatus(stageId);
      if (currentStatus === targetStatus) return;
      try {
        await ensureCsrfCookie();
        await updateLeadStatus(Number(leadId), targetStatus);
        await loadLeads();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to update lead status.",
        );
      }
    },
    [kanbanCards, loadLeads],
  );

  const handleAddLead = useCallback(
    async (values: LeadFormValues) => {
      await ensureCsrfCookie();
      const { fetchCrmLookups } = await import("@/lib/api/crm/lookups");
      const lookupsRes = await fetchCrmLookups();
      await createLead(
        leadFormToCreatePayload(values, {
          counties: lookupsRes.data.counties,
          product_interests: lookupsRes.data.product_interests,
        }),
      );
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
        assigned_to?: number;
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
        assigned_to: payload.assigned_to,
      });
    },
    [],
  );

  useEffect(() => {
    setListPage(1);
  }, [search, scope]);

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
              pagination={
                paginationMeta
                  ? {
                      currentPage: paginationMeta.current_page,
                      lastPage: paginationMeta.last_page,
                      perPage: paginationMeta.per_page ?? listPerPage,
                      total: paginationMeta.total,
                      onPageChange: setListPage,
                      onPerPageChange: (nextPerPage) => {
                        setListPerPage(nextPerPage);
                        setListPage(1);
                      },
                    }
                  : undefined
              }
              onLeadDeleted={loadLeads}
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
