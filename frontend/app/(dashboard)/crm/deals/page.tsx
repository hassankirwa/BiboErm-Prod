"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DealsKanban } from "@/components/crm/deals-kanban";
import { DealsPipeline } from "@/components/crm/deals-pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  BIBO_DEAL_STAGES,
  createDeal,
  dealValue,
  fetchDeals,
  type ApiDeal,
} from "@/lib/api/crm/deals";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import { AccountPicker } from "@/components/crm/account-picker";
import { ContactPicker } from "@/components/crm/contact-picker";
import { fetchAccount } from "@/lib/api/crm/accounts";
import { fetchContact } from "@/lib/api/crm/contacts";

function formatStage(stage: string): string {
  return (
    BIBO_DEAL_STAGES.find((s) => s.id === stage)?.label ??
    stage.replace(/_/g, " ")
  );
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return `KES ${num.toLocaleString()}`;
}

function dealTitle(deal: ApiDeal): string {
  return deal.name ?? deal.title ?? deal.reference ?? `#${deal.id}`;
}

function DealsListTab() {
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDeals({ per_page: 100 });
      setDeals(res.data ?? []);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load deals.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
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

  if (deals.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No deals yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deal</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Expected close</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell>
                <div className="font-medium">{dealTitle(deal)}</div>
                <div className="text-xs text-muted-foreground">
                  {deal.deal_number ?? deal.reference}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {formatStage(String(deal.stage ?? "new_deal"))}
                </Badge>
              </TableCell>
              <TableCell>{formatCurrency(dealValue(deal))}</TableCell>
              <TableCell>{deal.account?.name ?? "—"}</TableCell>
              <TableCell>
                {deal.expected_close_date
                  ? new Date(deal.expected_close_date).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/crm/deals/${deal.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DealsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    estimated_value: "",
    expected_close_date: "",
    site_address: "",
    contact_id: "",
    account_id: "",
  });
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [contactLabel, setContactLabel] = useState<string | null>(null);

  useEffect(() => {
    const contactId = searchParams.get("contact_id");
    const accountId = searchParams.get("account_id");
    if (contactId || accountId) {
      setForm((f) => ({
        ...f,
        contact_id: contactId ?? "",
        account_id: accountId ?? "",
      }));
      setDialogOpen(true);

      if (accountId) {
        fetchAccount(Number(accountId))
          .then((account) => setAccountLabel(account.name))
          .catch(() => setAccountLabel(null));
      }

      if (contactId) {
        fetchContact(Number(contactId))
          .then((contact) => {
            setContactLabel(
              contact.name ??
                [contact.first_name, contact.last_name].filter(Boolean).join(" "),
            );
            if (contact.account_id && !accountId) {
              setForm((f) => ({
                ...f,
                account_id: String(contact.account_id),
              }));
              if (contact.account?.name) {
                setAccountLabel(contact.account.name);
              } else {
                fetchAccount(contact.account_id)
                  .then((account) => setAccountLabel(account.name))
                  .catch(() => setAccountLabel(null));
              }
            }
          })
          .catch(() => setContactLabel(null));
      }
    }
  }, [searchParams]);

  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!form.account_id) {
      toast.error("Please select an account for this deal.");
      return;
    }
    setSaving(true);
    try {
      await ensureCsrfCookie();
      const deal = await createDeal({
        name: form.name.trim(),
        contact_id: form.contact_id ? Number(form.contact_id) : undefined,
        primary_contact_id: form.contact_id ? Number(form.contact_id) : undefined,
        account_id: form.account_id ? Number(form.account_id) : undefined,
        estimated_value: form.estimated_value
          ? Number(form.estimated_value)
          : undefined,
        expected_close_date: form.expected_close_date || undefined,
        site_address: form.site_address.trim() || undefined,
      });
      setDialogOpen(false);
      setForm({
        name: "",
        estimated_value: "",
        expected_close_date: "",
        site_address: "",
        contact_id: "",
        account_id: "",
      });
      setAccountLabel(null);
      setContactLabel(null);
      toast.success("Deal created.");
      router.push(`/crm/deals/${deal.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create deal.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Deals"
        subtitle="Track your sales pipeline"
        actions={
          <PermissionGate permission="deals.create">
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </PermissionGate>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <DealsPipeline />
          <Tabs defaultValue="kanban" className="space-y-4">
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
            <TabsContent value="kanban">
              <DealsKanban />
            </TabsContent>
            <TabsContent value="list">
              <DealsListTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Account *</Label>
              <AccountPicker
                required
                value={form.account_id ? Number(form.account_id) : null}
                displayLabel={accountLabel}
                onSelect={(account) => {
                  setForm((f) => ({ ...f, account_id: String(account.id) }));
                  setAccountLabel(account.name);
                }}
                onClear={() => {
                  setForm((f) => ({ ...f, account_id: "" }));
                  setAccountLabel(null);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Primary contact</Label>
              <ContactPicker
                value={form.contact_id ? Number(form.contact_id) : null}
                displayLabel={contactLabel}
                accountId={form.account_id ? Number(form.account_id) : null}
                onSelect={(contact) => {
                  setForm((f) => ({
                    ...f,
                    contact_id: String(contact.id),
                    account_id: contact.account_id
                      ? String(contact.account_id)
                      : f.account_id,
                  }));
                  setContactLabel(
                    contact.name ??
                      [contact.first_name, contact.last_name]
                        .filter(Boolean)
                        .join(" "),
                  );
                  if (contact.account_id) {
                    setAccountLabel(contact.account?.name ?? accountLabel);
                    if (!contact.account?.name) {
                      fetchAccount(contact.account_id)
                        .then((account) => setAccountLabel(account.name))
                        .catch(() => undefined);
                    }
                  }
                }}
                onClear={() => {
                  setForm((f) => ({ ...f, contact_id: "" }));
                  setContactLabel(null);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-name">Deal name *</Label>
              <Input
                id="deal-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-value">Estimated value (KES)</Label>
              <Input
                id="deal-value"
                type="number"
                min={0}
                value={form.estimated_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estimated_value: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-close">Expected close date</Label>
              <Input
                id="deal-close"
                type="date"
                value={form.expected_close_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expected_close_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-site">Site address</Label>
              <Input
                id="deal-site"
                value={form.site_address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, site_address: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.account_id}>
                {saving ? "Creating…" : "Create deal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
