"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  deleteLead,
  fetchLeads,
  leadDisplayName,
  type ApiLead,
} from "@/lib/api/crm/leads";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import { getUserInitials } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { apiLeadToKanbanCard } from "@/lib/crm-lead-mapper";
import type { LeadsFilterState } from "@/components/crm/leads-filters";
import { PermissionGate } from "@/components/auth/permission-gate";
import { LeadsActivityModal } from "@/components/crm/leads-activity-modal";
import { LeadComposeEmailDialog } from "@/components/crm/lead-compose-email-dialog";
import { toast } from "sonner";

import {
  getLeadStatusBadgeClass,
  getLeadStatusLabel,
} from "@/lib/crm-lead-status";
import {
  resolveLeadListCompany,
  resolveLeadListEmail,
  resolveLeadListPhone,
} from "@/lib/crm/lead-contact-utils";

type LeadsTableProps = {
  filters: LeadsFilterState;
  refreshKey?: number;
};

export function LeadsTable({ filters, refreshKey = 0 }: LeadsTableProps) {
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activityLead, setActivityLead] = useState<ApiLead | null>(null);
  const [emailLead, setEmailLead] = useState<ApiLead | null>(null);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<ApiLead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLeads = useCallback(() => {
    setIsLoading(true);
    setError(null);

    fetchLeads({
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      owner_id: filters.owner_id ? Number(filters.owner_id) : undefined,
      date_from: filters.date_from,
      date_to: filters.date_to,
    })
      .then((response) => {
        setLeads(response.data);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load leads.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    filters.search,
    filters.status,
    filters.owner_id,
    filters.date_from,
    filters.date_to,
  ]);

  useEffect(() => {
    const timer = setTimeout(loadLeads, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadLeads, filters.search, refreshKey, reloadKey]);

  async function handleLogCallSave(payload: {
    subject: string;
    description?: string;
    due_at?: string;
    activity_type?: string;
    assigned_to?: number;
  }) {
    if (!activityLead) return;
    try {
      await ensureCsrfCookie();
      await createActivity({
        lead_id: activityLead.id,
        subject: payload.subject,
        description: payload.description,
        due_at: payload.due_at,
        activity_type: payload.activity_type ?? "schedule_call",
        type: payload.activity_type ?? "schedule_call",
        assigned_to: payload.assigned_to,
      });
      toast.success("Call logged.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to log call.",
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteLeadTarget) return;
    setDeleting(true);
    try {
      await ensureCsrfCookie();
      await deleteLead(deleteLeadTarget.id);
      toast.success("Lead deleted.");
      setDeleteLeadTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete lead.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border bg-card py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No leads found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]">
                <Checkbox />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const name = leadDisplayName(lead);
              const phone = resolveLeadListPhone(lead);
              const email = resolveLeadListEmail(lead);
              const company = resolveLeadListCompany(lead);
              const assignee =
                lead.assignee ??
                lead.assigned_sales_user ??
                lead.lead_owner;

              return (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getUserInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.lead_number ?? lead.reference}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {phone !== "—" ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {phone}
                        </div>
                      ) : null}
                      {email !== "—" ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {email}
                        </div>
                      ) : null}
                      {phone === "—" && email === "—" ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.source ?? "-"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getLeadStatusBadgeClass(lead.status)}
                    >
                      {getLeadStatusLabel(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {company !== "—" ? company : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                            {getUserInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleDateString()
                        : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/leads/${lead.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <PermissionGate permission="leads.update">
                          <DropdownMenuItem asChild>
                            <Link href={`/crm/leads/${lead.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Lead
                            </Link>
                          </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="leads.update">
                          <DropdownMenuItem
                            onSelect={() => setActivityLead(lead)}
                          >
                            <Phone className="mr-2 h-4 w-4" />
                            Log Call
                          </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="leads.update">
                          <DropdownMenuItem onSelect={() => setEmailLead(lead)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="leads.convert">
                          <DropdownMenuItem asChild>
                            <Link href={`/crm/leads/${lead.id}/convert`}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Convert to Contact
                            </Link>
                          </DropdownMenuItem>
                        </PermissionGate>
                        <DropdownMenuSeparator />
                        <PermissionGate permission="leads.delete">
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setDeleteLeadTarget(lead)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </PermissionGate>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <LeadsActivityModal
        open={activityLead !== null}
        onOpenChange={(open) => {
          if (!open) setActivityLead(null);
        }}
        activityType="schedule_call"
        leadTitle={
          activityLead ? leadDisplayName(activityLead) : ""
        }
        onSave={handleLogCallSave}
      />

      {emailLead && (
        <LeadComposeEmailDialog
          open
          onOpenChange={(open) => {
            if (!open) setEmailLead(null);
          }}
          lead={apiLeadToKanbanCard(emailLead)}
          leadId={String(emailLead.id)}
        />
      )}

      <AlertDialog
        open={deleteLeadTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteLeadTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {deleteLeadTarget
                ? leadDisplayName(deleteLeadTarget)
                : "this lead"}
              . This action cannot be undone.
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
