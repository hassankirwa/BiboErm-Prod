"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Building2,
  Mail,
  Phone,
  MapPin,
  Eye,
  Edit,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { fetchAccounts, type ApiAccount } from "@/lib/api/crm/accounts";
import { ApiError } from "@/lib/api/errors";

type AccountsTableProps = {
  search?: string;
  status?: string;
};

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AccountsTable({ search, status }: AccountsTableProps) {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      fetchAccounts({
        search: search || undefined,
        status: status && status !== "all" ? status : undefined,
      })
        .then((response) => {
          if (!cancelled) setAccounts(response.data);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
              err instanceof ApiError ? err.message : "Failed to load accounts.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, status]);

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

  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No accounts found.
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
            <TableHead>Account</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id} className="group">
              <TableCell>
                <Checkbox />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.account_number ?? `#${account.id}`}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{account.industry ?? "-"}</span>
              </TableCell>
              <TableCell>
                {account.account_type ? (
                  <Badge variant="outline" className="rounded-[5px]">
                    {formatStatus(account.account_type)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {account.phone && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {account.phone}
                    </div>
                  )}
                  {account.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {account.email}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {account.physical_address || account.billing_address ? (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1">
                      {account.physical_address ?? account.billing_address}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    account.status === "active_customer" ||
                    account.status === "active_opportunity"
                      ? "default"
                      : "secondary"
                  }
                  className="rounded-[5px]"
                >
                  {formatStatus(account.status)}
                </Badge>
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
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Account
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create Deal
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
