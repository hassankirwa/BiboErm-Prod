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
import { fetchLeads } from "@/lib/api/crm/leads";
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
            <LeadsKanbanView returnView={view} apiCards={kanbanCards} />
          )}
          {view === "calendar" && <LeadsCalendarView returnView={view} />}
          {view === "map" && (
            <LeadsMapView className="min-h-0 flex-1" returnView={view} />
          )}
        </>
      )}
    </div>
  );
}
