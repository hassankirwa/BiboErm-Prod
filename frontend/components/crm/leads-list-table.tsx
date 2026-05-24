"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  Plus,
  Star,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  LEADS_TOTAL_COUNT,
  leadsListRows,
  type LeadActivity,
  type LeadListRow,
} from "@/lib/leads-list-data";

/** Uniform pill size for activity & stage columns in list view */
const listTagBase =
  "inline-flex h-6 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium leading-none";

function ListTag({
  children,
  className,
  widthClass,
}: {
  children: React.ReactNode;
  className?: string;
  widthClass: string;
}) {
  return (
    <span className={cn(listTagBase, widthClass, className)}>{children}</span>
  );
}

function ActivityCell({ activity }: { activity: LeadActivity }) {
  const activityTagWidth = "w-[4.75rem]";

  if (activity.type === "today") {
    return (
      <ListTag
        widthClass={activityTagWidth}
        className="bg-orange-100 text-orange-700"
      >
        Today
      </ListTag>
    );
  }
  if (activity.type === "date") {
    return (
      <ListTag
        widthClass={activityTagWidth}
        className={
          activity.tone === "green"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }
      >
        {activity.label}
      </ListTag>
    );
  }
  return (
    <ListTag
      widthClass={activityTagWidth}
      className="bg-muted text-muted-foreground"
    >
      <Calendar className="h-3.5 w-3.5" />
    </ListTag>
  );
}

function StageTag({ stage, className }: { stage: string; className: string }) {
  return (
    <ListTag
      widthClass="w-[10.5rem] max-w-[10.5rem] overflow-hidden text-ellipsis whitespace-nowrap"
      className={className}
      title={stage}
    >
      {stage}
    </ListTag>
  );
}

function LeadRowActions() {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 rounded-[4px] border-border"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 rounded-[4px] border-border"
      >
        <Phone className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function LeadMobileCard({
  row,
  returnView,
}: {
  row: LeadListRow;
  returnView: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/crm/leads/${row.id}?view=${returnView}`}
            className="text-left text-sm font-medium text-[#2563eb] hover:underline"
          >
            {row.leadName}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.company}
          </p>
        </div>
        <ActivityCell activity={row.activity} />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StageTag stage={row.stage} className={row.stageClassName} />
        <span className="text-xs text-muted-foreground">{row.source}</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="truncate">{row.email}</p>
        <p>{row.phone}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">
              {row.ownerInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {row.owner}
          </span>
        </div>
        <LeadRowActions />
      </div>
    </div>
  );
}

export function LeadsListTable({
  search,
  returnView = "list",
  apiRows,
  totalCount,
}: {
  search: string;
  returnView?: string;
  apiRows?: LeadListRow[];
  totalCount?: number;
}) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("25");
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const sourceRows = apiRows ?? leadsListRows;
  const recordTotal = totalCount ?? (apiRows ? apiRows.length : LEADS_TOTAL_COUNT);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sourceRows;
    return sourceRows.filter(
      (r) =>
        r.leadName.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)
    );
  }, [search, sourceRows]);

  const perPage = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(recordTotal / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, recordTotal, start + filtered.length - 1);
  const displayEnd = Math.min(end, start + filtered.length - 1);

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected[r.id]);

  return (
    <div className="flex min-w-0 flex-col">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    const next: Record<string, boolean> = {};
                    if (checked) {
                      filtered.forEach((r) => {
                        next[r.id] = true;
                      });
                    }
                    setSelected(next);
                  }}
                />
              </th>
              <th className="w-10 px-2 py-3" />
              <th className="w-[5.5rem] px-2 py-3">Activity</th>
              <th className="min-w-[180px] px-3 py-3">Lead Name</th>
              <th className="min-w-[160px] px-3 py-3">Company</th>
              <th className="min-w-[180px] px-3 py-3">Email</th>
              <th className="min-w-[120px] px-3 py-3">Phone</th>
              <th className="min-w-[140px] px-3 py-3">Lead Stage</th>
              <th className="min-w-[100px] px-3 py-3">Lead Source</th>
              <th className="min-w-[140px] px-3 py-3">Owner</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/80 transition-colors hover:bg-muted/20"
              >
                <td className="px-3 py-2.5">
                  <Checkbox
                    checked={!!selected[row.id]}
                    onCheckedChange={(checked) =>
                      setSelected((s) => ({ ...s, [row.id]: !!checked }))
                    }
                  />
                </td>
                <td className="px-2 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setStarred((s) => ({ ...s, [row.id]: !s[row.id] }))
                    }
                    className="text-muted-foreground hover:text-amber-500"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        starred[row.id] && "fill-amber-400 text-amber-400"
                      )}
                    />
                  </button>
                </td>
                <td className="px-2 py-2.5">
                  <ActivityCell activity={row.activity} />
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/crm/leads/${row.id}?view=${returnView}`}
                    className="font-medium text-[#2563eb] hover:underline"
                  >
                    {row.leadName}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-foreground">{row.company}</td>
                <td className="px-3 py-2.5 text-foreground">{row.email}</td>
                <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                  {row.phone}
                </td>
                <td className="px-3 py-2.5">
                  <StageTag stage={row.stage} className={row.stageClassName} />
                </td>
                <td className="px-3 py-2.5 text-foreground">{row.source}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {row.ownerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="whitespace-nowrap">{row.owner}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <LeadRowActions />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((row) => (
          <LeadMobileCard key={row.id} row={row} returnView={returnView} />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center sm:text-left">
          Showing {start} to {displayEnd} of {recordTotal} leads
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm">Rows per page</span>
            <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
              <SelectTrigger className="h-8 w-[70px] rounded-[5px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-8 w-8 text-sm",
                  page === n && "bg-primary text-primary-foreground"
                )}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
