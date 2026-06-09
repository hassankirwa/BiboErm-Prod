"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import {
  ACTIVE_LEAD_STATUSES,
  getLeadStatusLabel,
  LEGACY_LEAD_STATUSES,
} from "@/lib/crm-lead-status";

export type LeadsFilterState = {
  search: string;
  status: string;
  owner_id?: string;
  date_from?: string;
  date_to?: string;
};

type LeadsFiltersProps = {
  filters: LeadsFilterState;
  onFiltersChange: (filters: LeadsFilterState) => void;
  onRefresh?: () => void;
};

export function LeadsFilters({
  filters,
  onFiltersChange,
  onRefresh,
}: LeadsFiltersProps) {
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetchCrmAssignableUsers({ role: "sales_representative" })
      .then((res) =>
        setOwners(res.data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads..."
            className="pl-8 h-9"
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(status) =>
            onFiltersChange({ ...filters, status })
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ACTIVE_LEAD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getLeadStatusLabel(status)}
              </SelectItem>
            ))}
            {LEGACY_LEAD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getLeadStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.owner_id ?? "all"}
          onValueChange={(owner_id) =>
            onFiltersChange({
              ...filters,
              owner_id: owner_id === "all" ? undefined : owner_id,
            })
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="h-9 w-[140px]"
          value={filters.date_from ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, date_from: e.target.value || undefined })
          }
          title="From date"
        />
        <Input
          type="date"
          className="h-9 w-[140px]"
          value={filters.date_to ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, date_to: e.target.value || undefined })
          }
          title="To date"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Filter className="h-4 w-4" />
          More Filters
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
