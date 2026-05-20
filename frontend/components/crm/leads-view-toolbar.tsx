"use client";

import {
  ArrowDownUp,
  Calendar,
  Filter,
  HelpCircle,
  List,
  MapPin,
  Search,
  Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadsCreateMenu } from "@/components/crm/leads-create-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmPillToggle } from "@/components/crm/crm-pill-toggle";
import type { LeadViewMode } from "@/lib/leads-list-data";
import { leadScopeFilters } from "@/lib/leads-list-data";

const viewOptions: {
  id: LeadViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "list", label: "List view", icon: List },
  { id: "kanban", label: "Kanban view", icon: Columns3 },
  { id: "calendar", label: "Calendar view", icon: Calendar },
  { id: "map", label: "Map view", icon: MapPin },
];

export function LeadsViewToolbar({
  view,
  onViewChange,
  scope,
  onScopeChange,
  search,
  onSearchChange,
}: {
  view: LeadViewMode;
  onViewChange: (view: LeadViewMode) => void;
  scope: string;
  onScopeChange: (scope: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: scope, filter, sort, views */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Select value={scope} onValueChange={onScopeChange}>
            <SelectTrigger className="h-9 w-full min-w-[130px] rounded-[5px] border-border bg-background text-sm font-medium sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadScopeFilters.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-2 text-[#1e3a5f] hover:bg-[#ebf2ff]/60"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden text-sm font-medium sm:inline">Filter</span>
          </Button>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-2 text-[#1e3a5f] hover:bg-[#ebf2ff]/60"
          >
            <ArrowDownUp className="h-4 w-4" />
            <span className="hidden text-sm font-medium sm:inline">Sort</span>
          </Button>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <CrmPillToggle
            value={view}
            onChange={onViewChange}
            options={viewOptions.map((opt) => ({
              id: opt.id,
              icon: opt.icon,
              title: opt.label,
            }))}
            showMoreTrigger
          />
        </div>

        {/* Right: search, create, help */}
        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px] sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search All Leads"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full rounded-[5px] border-border bg-background pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <LeadsCreateMenu currentView={view} />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
