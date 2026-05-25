"use client";

import { useEffect, useState } from "react";
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
  fetchLeads,
  leadDisplayName,
  type ApiLead,
} from "@/lib/api/leads";
import { getUserInitials } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import type { LeadsFilterState } from "@/components/crm/leads-filters";

const statusColors: Record<string, string> = {
  new: "bg-info/10 text-info border-info/20",
  contacted: "bg-primary/10 text-primary border-primary/20",
  interested: "bg-primary/10 text-primary border-primary/20",
  qualified: "bg-success/10 text-success border-success/20",
  site_visit_required: "bg-warning/10 text-warning border-warning/20",
  site_visit_scheduled: "bg-warning/10 text-warning border-warning/20",
  measurements_captured: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  converted: "bg-success/10 text-success border-success/20",
  quotation_sent: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  negotiation: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  won: "bg-success/10 text-success border-success/20",
  lost: "bg-destructive/10 text-destructive border-destructive/20",
  not_reachable: "bg-muted text-muted-foreground border-muted",
  unqualified: "bg-destructive/10 text-destructive border-destructive/20",
  dormant: "bg-muted text-muted-foreground border-muted",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type LeadsTableProps = {
  filters: LeadsFilterState;
  refreshKey?: number;
};

export function LeadsTable({ filters, refreshKey = 0 }: LeadsTableProps) {
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      fetchLeads({
        search: filters.search || undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        owner_id: filters.owner_id ? Number(filters.owner_id) : undefined,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
        .then((response) => {
          if (!cancelled) {
            setLeads(response.data);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
              err instanceof ApiError
                ? err.message
                : "Failed to load leads.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    }, filters.search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters.search, filters.status, filters.owner_id, filters.date_from, filters.date_to, refreshKey]);

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
                    {lead.phone && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{lead.source ?? "-"}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColors[lead.status] ?? ""}
                  >
                    {formatStatus(lead.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {lead.account_name ?? lead.company ?? "-"}
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
                      <DropdownMenuItem asChild>
                        <Link href={`/crm/leads/${lead.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Lead
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="mr-2 h-4 w-4" />
                        Log Call
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Convert to Contact
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
