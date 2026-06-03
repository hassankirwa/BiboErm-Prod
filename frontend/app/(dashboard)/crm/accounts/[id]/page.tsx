"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import { ChevronLeft, Mail, Phone, MapPin, Globe, Pencil, FolderKanban } from "lucide-react";
import {
  fetchAccount,
  fetchAccountDeals,
  updateAccount,
  type ApiAccount,
} from "@/lib/api/crm/accounts";
import type { ApiDeal } from "@/lib/api/crm/types";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

function accountToForm(account: ApiAccount) {
  return {
    name: account.name,
    account_type: account.account_type ?? "",
    industry: account.industry ?? "",
    phone: account.phone ?? "",
    email: account.email ?? "",
    website: account.website ?? "",
    status: account.status ?? "prospect",
    physical_address: account.physical_address ?? "",
    billing_address: account.billing_address ?? "",
  };
}

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function dealTitle(deal: ApiDeal): string {
  return deal.name ?? deal.title ?? deal.reference ?? `Deal #${deal.id}`;
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const accountId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canEdit = can("accounts.update");
  const canViewDeals = can("deals.view");

  const [account, setAccount] = useState<ApiAccount | null>(null);
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    account_type: "",
    industry: "",
    phone: "",
    email: "",
    website: "",
    status: "prospect",
    physical_address: "",
    billing_address: "",
  });

  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEdit) {
      setIsEditing(true);
    }
  }, [searchParams, canEdit]);

  useEffect(() => {
    if (!Number.isFinite(accountId) || accountId <= 0) {
      setError("Invalid account id.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchAccount(accountId)
      .then((data) => {
        if (!cancelled) {
          setAccount(data);
          setForm(accountToForm(data));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load account.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (!canViewDeals || !Number.isFinite(accountId) || accountId <= 0) {
      return;
    }

    let cancelled = false;
    setDealsLoading(true);

    fetchAccountDeals(accountId, { per_page: 50 })
      .then((response) => {
        if (!cancelled) setDeals(response.data);
      })
      .catch(() => {
        if (!cancelled) setDeals([]);
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, canViewDeals]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await ensureCsrfCookie();
      const updated = await updateAccount(accountId, {
        name: form.name.trim(),
        account_type: form.account_type.trim() || undefined,
        industry: form.industry.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        status: form.status || undefined,
        physical_address: form.physical_address.trim() || undefined,
        billing_address: form.billing_address.trim() || undefined,
      });
      setAccount(updated);
      setForm(accountToForm(updated));
      setIsEditing(false);
      router.replace(`/crm/accounts/${accountId}`);
      toast.success("Account updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update account.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (account) setForm(accountToForm(account));
    setIsEditing(false);
    router.replace(`/crm/accounts/${accountId}`);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex h-full flex-col">
        <AppHeader
          title="Account"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/accounts">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="p-6 text-sm text-destructive">
          {error ?? "Account not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={account.name}
        subtitle={account.account_number ?? `#${account.id}`}
        actions={
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <PermissionGate permission="projects.create">
                  <Button size="sm" asChild>
                    <Link
                      href={`/crm/projects/new?account_id=${accountId}`}
                    >
                      <FolderKanban className="mr-1 h-4 w-4" />
                      Create Project
                    </Link>
                  </Button>
                </PermissionGate>
                <PermissionGate permission="accounts.update">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                </PermissionGate>
              </>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/accounts">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <Card className="max-w-2xl border-border">
          <CardHeader>
            <CardTitle className="text-base">
              {isEditing ? "Edit Account" : "Account Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing && canEdit ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-name">Name *</Label>
                  <Input
                    id="edit-account-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-industry">Industry</Label>
                  <Input
                    id="edit-industry"
                    value={form.industry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, industry: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-type">Account type</Label>
                  <Input
                    id="edit-account-type"
                    value={form.account_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, account_type: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-email">Email</Label>
                  <Input
                    id="edit-account-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-phone">Phone</Label>
                  <Input
                    id="edit-account-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={form.website}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, website: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active_opportunity">
                        Active Opportunity
                      </SelectItem>
                      <SelectItem value="active_customer">
                        Active Customer
                      </SelectItem>
                      <SelectItem value="repeat_customer">
                        Repeat Customer
                      </SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-physical-address">Physical address</Label>
                  <Textarea
                    id="edit-physical-address"
                    value={form.physical_address}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        physical_address: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-billing-address">Billing address</Label>
                  <Textarea
                    id="edit-billing-address"
                    value={form.billing_address}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        billing_address: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                {account.status && (
                  <Badge variant="outline" className="capitalize">
                    {account.status.replace(/_/g, " ")}
                  </Badge>
                )}
                {account.account_type && (
                  <p>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {account.account_type}
                  </p>
                )}
                {account.industry && (
                  <p>
                    <span className="text-muted-foreground">Industry:</span>{" "}
                    {account.industry}
                  </p>
                )}
                {account.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {account.email}
                  </p>
                )}
                {account.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {account.phone}
                  </p>
                )}
                {account.website && (
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {account.website}
                  </p>
                )}
                {(account.physical_address || account.billing_address) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {account.physical_address ?? account.billing_address}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {account.contacts && account.contacts.length > 0 && (
          <Card className="max-w-2xl border-border">
            <CardHeader>
              <CardTitle className="text-base">Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {account.contacts.map((contact) => (
                  <li key={contact.id}>
                    <Link
                      href={`/crm/contacts/${contact.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {contact.name ??
                        [contact.first_name, contact.last_name]
                          .filter(Boolean)
                          .join(" ") ??
                        `Contact #${contact.id}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {canViewDeals && (
          <Card className="max-w-3xl border-border">
            <CardHeader>
              <CardTitle className="text-base">Related Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="h-6 w-6 text-primary" />
                </div>
              ) : deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deals linked to this account.
                </p>
              ) : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell>
                            <Link
                              href={`/crm/deals/${deal.id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {dealTitle(deal)}
                            </Link>
                            {deal.deal_number && (
                              <p className="text-xs text-muted-foreground">
                                {deal.deal_number}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm capitalize">
                              {formatStatus(deal.stage)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {deal.status ? (
                              <Badge variant="outline" className="capitalize">
                                {formatStatus(deal.status)}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
