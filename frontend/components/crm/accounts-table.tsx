"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Building2,
  Mail,
  Phone,
  MapPin,
  Eye,
  Edit,
  FolderPlus,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { fetchAccounts, type ApiAccount } from "@/lib/api/crm/accounts";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

type AccountsTableProps = {
  search?: string;
  status?: string;
  refreshKey?: number;
};

type ActivityDialogState = {
  account: ApiAccount;
  activityType: "call" | "email";
} | null;

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AccountsTable({ search, status, refreshKey = 0 }: AccountsTableProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityDialog, setActivityDialog] = useState<ActivityDialogState>(null);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityForm, setActivityForm] = useState({
    subject: "",
    description: "",
    due_at: new Date().toISOString().slice(0, 10),
  });

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
  }, [search, status, refreshKey]);

  function openActivityDialog(account: ApiAccount, activityType: "call" | "email") {
    if (!account.primary_contact_id) {
      toast.error(
        "Assign a primary contact to this account before logging activities.",
      );
      return;
    }
    setActivityForm({
      subject:
        activityType === "call"
          ? `Call — ${account.name}`
          : `Email — ${account.name}`,
      description: "",
      due_at: new Date().toISOString().slice(0, 10),
    });
    setActivityDialog({ account, activityType });
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityDialog?.account.primary_contact_id || !activityForm.subject.trim()) {
      return;
    }
    setActivitySaving(true);
    try {
      await ensureCsrfCookie();
      await createActivity({
        contact_id: activityDialog.account.primary_contact_id,
        subject: activityForm.subject.trim(),
        description: activityForm.description.trim() || undefined,
        activity_type: activityDialog.activityType,
        type: activityDialog.activityType,
        due_at: activityForm.due_at
          ? `${activityForm.due_at}T12:00:00`
          : undefined,
      });
      toast.success("Activity logged.");
      setActivityDialog(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to log activity.",
      );
    } finally {
      setActivitySaving(false);
    }
  }

  function dealHref(account: ApiAccount): string {
    const params = new URLSearchParams({ account_id: String(account.id) });
    if (account.primary_contact_id) {
      params.set("contact_id", String(account.primary_contact_id));
    }
    return `/crm/deals?${params.toString()}`;
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

  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No accounts found.
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
                      <DropdownMenuItem asChild>
                        <Link href={`/crm/accounts/${account.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <PermissionGate permission="accounts.update">
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/accounts/${account.id}?edit=1`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Account
                          </Link>
                        </DropdownMenuItem>
                      </PermissionGate>
                      <PermissionGate permission="deals.create">
                        <DropdownMenuItem
                          onSelect={() => router.push(dealHref(account))}
                        >
                          <FolderPlus className="mr-2 h-4 w-4" />
                          Create Deal
                        </DropdownMenuItem>
                      </PermissionGate>
                      <PermissionGate permission="activities.create">
                        <DropdownMenuItem
                          onSelect={() => openActivityDialog(account, "call")}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Log Call
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => openActivityDialog(account, "email")}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                      </PermissionGate>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={activityDialog !== null}
        onOpenChange={(open) => !open && setActivityDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activityDialog?.activityType === "call"
                ? "Log Call"
                : "Log Email"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogActivity} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="account-activity-subject">Subject</Label>
              <Input
                id="account-activity-subject"
                value={activityForm.subject}
                onChange={(e) =>
                  setActivityForm((f) => ({ ...f, subject: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-activity-description">Notes</Label>
              <Textarea
                id="account-activity-description"
                value={activityForm.description}
                onChange={(e) =>
                  setActivityForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-activity-due">Due date</Label>
              <Input
                id="account-activity-due"
                type="date"
                value={activityForm.due_at}
                onChange={(e) =>
                  setActivityForm((f) => ({ ...f, due_at: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActivityDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={activitySaving}>
                {activitySaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
