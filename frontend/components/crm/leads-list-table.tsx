"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Mail,
  MoreHorizontal,
  Phone,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { deleteLead, updateLeadStatus } from "@/lib/api/crm/leads";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  LEAD_STATUS_LABELS,
  getNextLeadStatusAction,
  statusToKanbanStage,
} from "@/lib/crm-lead-status";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";
import { PermissionGate } from "@/components/auth/permission-gate";
import { LeadsActivityModal } from "@/components/crm/leads-activity-modal";
import { LeadComposeEmailDialog } from "@/components/crm/lead-compose-email-dialog";
import { toast } from "sonner";

/** Uniform pill size for activity & stage columns in list view */
const listTagBase =
  "inline-flex h-6 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium leading-none";

function ListTag({
  children,
  className,
  title,
  widthClass,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  widthClass: string;
}) {
  return (
    <span className={cn(listTagBase, widthClass, className)} title={title}>
      {children}
    </span>
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

function listRowToKanbanCard(row: LeadListRow): LeadKanbanCard {
  return {
    id: row.id,
    stageId: statusToKanbanStage(row.statusKey),
    statusKey: row.statusKey,
    title: row.leadName,
    location: "—",
    owner: row.owner,
    nextActionDate: new Date().toISOString().slice(0, 10),
    estimatedValue: 0,
    tag: row.stage,
    company: row.company,
    phone: row.phone,
    email: row.email,
    source: row.source,
  };
}

function LeadListRowMenu({
  row,
  returnView,
  onChanged,
}: {
  row: LeadListRow;
  returnView: string;
  onChanged?: () => void;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const nextStatusAction = getNextLeadStatusAction(row.statusKey);

  async function handleLogCallSave(payload: {
    subject: string;
    description?: string;
    due_at?: string;
    activity_type?: string;
    assigned_to?: number;
  }) {
    try {
      await ensureCsrfCookie();
      await createActivity({
        lead_id: Number(row.id),
        subject: payload.subject,
        description: payload.description,
        due_at: payload.due_at,
        activity_type: payload.activity_type ?? "schedule_call",
        type: payload.activity_type ?? "schedule_call",
        assigned_to: payload.assigned_to,
      });
      toast.success("Call logged.");
      setActivityOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to log call.",
      );
    }
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await ensureCsrfCookie();
      await deleteLead(Number(row.id));
      toast.success("Lead deleted.");
      setDeleteOpen(false);
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete lead.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleAdvanceStatus() {
    if (!nextStatusAction) return;
    setAdvancing(true);
    try {
      await ensureCsrfCookie();
      await updateLeadStatus(Number(row.id), nextStatusAction.status);
      toast.success(`Lead advanced to ${LEAD_STATUS_LABELS[nextStatusAction.status]}.`);
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to advance lead.",
      );
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-[4px] border-border"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/crm/leads/${row.id}?view=${returnView}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          <PermissionGate permission="leads.update">
            <DropdownMenuItem asChild>
              <Link href={`/crm/leads/${row.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Lead
              </Link>
            </DropdownMenuItem>
          </PermissionGate>
          {nextStatusAction && (
            <PermissionGate permission="leads.update">
              <DropdownMenuItem
                disabled={advancing}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleAdvanceStatus();
                }}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                {advancing ? "Advancing..." : nextStatusAction.label}
              </DropdownMenuItem>
            </PermissionGate>
          )}
          <PermissionGate permission="leads.update">
            <DropdownMenuItem onSelect={() => setActivityOpen(true)}>
              <Phone className="mr-2 h-4 w-4" />
              Log Call
            </DropdownMenuItem>
          </PermissionGate>
          <PermissionGate permission="leads.update">
            <DropdownMenuItem onSelect={() => setEmailOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </DropdownMenuItem>
          </PermissionGate>
          <PermissionGate permission="leads.convert">
            <DropdownMenuItem asChild>
              <Link href={`/crm/leads/${row.id}/convert`}>
                <UserPlus className="mr-2 h-4 w-4" />
                Convert to Contact
              </Link>
            </DropdownMenuItem>
          </PermissionGate>
          <DropdownMenuSeparator />
          <PermissionGate permission="leads.delete">
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </PermissionGate>
        </DropdownMenuContent>
      </DropdownMenu>

      <LeadsActivityModal
        open={activityOpen}
        onOpenChange={setActivityOpen}
        activityType="schedule_call"
        leadTitle={row.leadName}
        onSave={handleLogCallSave}
      />

      {emailOpen && (
        <LeadComposeEmailDialog
          open
          onOpenChange={setEmailOpen}
          lead={listRowToKanbanCard(row)}
          leadId={row.id}
          returnView={returnView}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {row.leadName}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LeadMobileCard({
  row,
  returnView,
  onChanged,
}: {
  row: LeadListRow;
  returnView: string;
  onChanged?: () => void;
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
        <LeadListRowMenu
          row={row}
          returnView={returnView}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}

export type LeadsListPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function LeadsListTable({
  search,
  returnView = "list",
  apiRows,
  totalCount,
  pagination,
  onLeadDeleted,
}: {
  search: string;
  returnView?: string;
  apiRows?: LeadListRow[];
  totalCount?: number;
  pagination?: LeadsListPagination;
  onLeadDeleted?: () => void;
}) {
  const [localPage, setLocalPage] = useState(1);
  const [localRowsPerPage, setLocalRowsPerPage] = useState("25");
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const sourceRows = apiRows ?? leadsListRows;
  const recordTotal =
    pagination?.total ??
    totalCount ??
    (apiRows ? apiRows.length : LEADS_TOTAL_COUNT);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || pagination) return sourceRows;
    return sourceRows.filter(
      (r) =>
        r.leadName.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)
    );
  }, [search, sourceRows, pagination]);

  const perPage = pagination?.perPage ?? Number(localRowsPerPage);
  const page = pagination?.currentPage ?? localPage;
  const totalPages = pagination?.lastPage ?? Math.max(1, Math.ceil(recordTotal / perPage));
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  const start =
    recordTotal === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, recordTotal);
  const displayRows = pagination
    ? filtered
    : filtered.slice((page - 1) * perPage, page * perPage);
  const displayEnd = pagination
    ? end
    : Math.min(page * perPage, recordTotal, start + displayRows.length - 1);

  const allSelected =
    displayRows.length > 0 && displayRows.every((r) => selected[r.id]);

  function handlePageChange(nextPage: number) {
    if (pagination) {
      pagination.onPageChange(nextPage);
    } else {
      setLocalPage(nextPage);
    }
  }

  function handleRowsPerPageChange(value: string) {
    const nextPerPage = Number(value);
    if (pagination) {
      pagination.onPerPageChange(nextPerPage);
    } else {
      setLocalRowsPerPage(value);
      setLocalPage(1);
    }
  }

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
                      displayRows.forEach((r) => {
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
            {displayRows.map((row) => (
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
                  <LeadListRowMenu
                    row={row}
                    returnView={returnView}
                    onChanged={onLeadDeleted}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {displayRows.map((row) => (
          <LeadMobileCard
            key={row.id}
            row={row}
            returnView={returnView}
            onChanged={onLeadDeleted}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center sm:text-left">
          {recordTotal === 0
            ? "Showing 0 leads"
            : `Showing ${start} to ${displayEnd} of ${recordTotal} leads`}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm">Rows per page</span>
            <Select
              value={String(perPage)}
              onValueChange={handleRowsPerPageChange}
            >
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
              onClick={() => handlePageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers.map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-8 w-8 text-sm",
                  page === n && "bg-primary text-primary-foreground"
                )}
                onClick={() => handlePageChange(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
