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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Phone,
  Mail,
  Eye,
  Edit,
  Building,
  MapPin,
  FolderPlus,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  contactDisplayName,
  fetchContacts,
  type ApiContact,
} from "@/lib/api/crm/contacts";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import { getUserInitials } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

type ContactsTableProps = {
  search?: string;
  refreshKey?: number;
};

type ActivityDialogState = {
  contact: ApiContact;
  activityType: "call" | "email";
} | null;

export function ContactsTable({ search, refreshKey = 0 }: ContactsTableProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ApiContact[]>([]);
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
      fetchContacts({ search: search || undefined })
        .then((response) => {
          if (!cancelled) setContacts(response.data);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
              err instanceof ApiError
                ? err.message
                : "Failed to load contacts.",
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
  }, [search, refreshKey]);

  function openActivityDialog(contact: ApiContact, activityType: "call" | "email") {
    const name = contactDisplayName(contact);
    setActivityForm({
      subject:
        activityType === "call"
          ? `Call — ${name}`
          : `Email — ${name}`,
      description: "",
      due_at: new Date().toISOString().slice(0, 10),
    });
    setActivityDialog({ contact, activityType });
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityDialog || !activityForm.subject.trim()) return;
    setActivitySaving(true);
    try {
      await ensureCsrfCookie();
      await createActivity({
        contact_id: activityDialog.contact.id,
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

  function dealHref(contact: ApiContact): string {
    const params = new URLSearchParams({ contact_id: String(contact.id) });
    if (contact.account_id) {
      params.set("account_id", String(contact.account_id));
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

  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No contacts found.
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
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const name = contactDisplayName(contact);
              const accountName = contact.account?.name;

              return (
                <TableRow key={contact.id} className="group">
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getUserInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.contact_number ?? `#${contact.id}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {accountName ? (
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{accountName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {contact.email}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {contact.phone}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.account?.physical_address ||
                    contact.account?.billing_address ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {contact.account?.physical_address ??
                          contact.account?.billing_address}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {contact.created_at
                        ? new Date(contact.created_at).toLocaleDateString()
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
                          <Link href={`/crm/contacts/${contact.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <PermissionGate permission="contacts.update">
                          <DropdownMenuItem asChild>
                            <Link href={`/crm/contacts/${contact.id}?edit=1`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Contact
                            </Link>
                          </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="deals.create">
                          <DropdownMenuItem
                            onSelect={() => router.push(dealHref(contact))}
                          >
                            <FolderPlus className="mr-2 h-4 w-4" />
                            Create Deal
                          </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="activities.create">
                          <DropdownMenuItem
                            onSelect={() =>
                              openActivityDialog(contact, "call")
                            }
                          >
                            <Phone className="mr-2 h-4 w-4" />
                            Log Call
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              openActivityDialog(contact, "email")
                            }
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
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
              <Label htmlFor="activity-subject">Subject</Label>
              <Input
                id="activity-subject"
                value={activityForm.subject}
                onChange={(e) =>
                  setActivityForm((f) => ({ ...f, subject: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activity-description">Notes</Label>
              <Textarea
                id="activity-description"
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
              <Label htmlFor="activity-due">Due date</Label>
              <Input
                id="activity-due"
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
