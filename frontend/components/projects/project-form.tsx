"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountPicker } from "@/components/crm/account-picker";
import { ContactPicker } from "@/components/crm/contact-picker";
import { DealPicker } from "@/components/crm/deal-picker";
import { fetchAccount, fetchAccountDeals } from "@/lib/api/crm/accounts";
import { contactDisplayName, fetchContact } from "@/lib/api/crm/contacts";
import { dealDisplayName, fetchDeal } from "@/lib/api/crm/deals";
import type { ApiAccount, ApiDeal } from "@/lib/api/crm/types";
import {
  dealLinkLabel,
  findEmbeddedContact,
  pickBestDealForAccount,
  pickDealOnAccountChange,
  resolvePrimaryContactId,
} from "@/lib/crm/project-form-linking";
import { createProject, type CreateProjectPayload } from "@/lib/api/projects";
import { projectDetailPath, projectPipelinePath, type ProjectViewMode } from "@/lib/projects/paths";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

type ProjectFormProps = {
  defaultAccountId?: number | null;
  defaultAccountName?: string | null;
  defaultDealId?: number | null;
  defaultDealLabel?: string | null;
  redirectTo?: "detail" | "pipeline";
  mode?: ProjectViewMode;
};

function mapAccountTypeToProjectType(accountType: string | null | undefined): string {
  const t = (accountType ?? "").toLowerCase();
  if (t.includes("commercial")) return "commercial";
  if (t.includes("apartment")) return "apartment_block";
  if (t.includes("renovation")) return "renovation";
  return "residential";
}

function mapProductInterestsToProjectType(
  interests: string[] | null | undefined,
): string | null {
  if (!interests?.length) return null;
  const joined = interests.join(" ").toLowerCase();
  if (joined.includes("commercial")) return "commercial";
  if (joined.includes("apartment")) return "apartment_block";
  if (joined.includes("renovation")) return "renovation";
  if (joined.includes("residential")) return "residential";
  return null;
}

function inferLocationType(address: string | null | undefined): string {
  if (!address?.trim()) return "nairobi";
  return address.toLowerCase().includes("nairobi") ? "nairobi" : "outside_nairobi";
}

function accountSiteAddress(account: ApiAccount): string {
  return (account.physical_address ?? account.billing_address ?? "").trim();
}

function suggestedProjectName(account: ApiAccount, deal?: ApiDeal | null): string {
  if (deal) {
    return dealDisplayName(deal);
  }
  return (account.name ?? "").trim();
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function ProjectForm({
  defaultAccountId = null,
  defaultAccountName = null,
  defaultDealId = null,
  defaultDealLabel = null,
  redirectTo = "detail",
  mode = "projects",
}: ProjectFormProps) {
  const router = useRouter();
  const [prefillLoading, setPrefillLoading] = useState(
    !!(defaultAccountId || defaultDealId),
  );
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(defaultAccountId);
  const [accountName, setAccountName] = useState<string | null>(defaultAccountName);
  const [dealId, setDealId] = useState<number | null>(defaultDealId);
  const [dealLabel, setDealLabel] = useState<string | null>(defaultDealLabel);
  const [contactId, setContactId] = useState<number | null>(null);
  const [contactLabel, setContactLabel] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "residential",
    location_type: "nairobi",
    site_address: "",
    priority: "normal",
    overage_buffer_percent: "10",
    projected_start: "",
    projected_end: "",
    client_notes: "",
    internal_notes: "",
  });

  function linkContact(
    account: ApiAccount,
    deal: ApiDeal | null | undefined,
    contactId: number,
    cancelledRef: { current: boolean },
  ) {
    setContactId(contactId);

    const embedded = findEmbeddedContact(account, deal, contactId);
    if (embedded) {
      setContactLabel(contactDisplayName(embedded));
      return;
    }

    setContactLabel(`Contact #${contactId}`);
    void fetchContact(contactId)
      .then((contact) => {
        if (!cancelledRef.current) setContactLabel(contactDisplayName(contact));
      })
      .catch(() => {
        /* keep fallback label */
      });
  }

  function applyAccountDealPrefill(
    account: ApiAccount,
    deal: ApiDeal | null | undefined,
    cancelledRef: { current: boolean },
    options?: { linkDeal?: boolean },
  ) {
    const siteAddress =
      deal?.site_address?.trim() || accountSiteAddress(account) || "";
    const projectType =
      (deal && mapProductInterestsToProjectType(deal.product_interests)) ||
      mapAccountTypeToProjectType(account.account_type);

    setAccountId(account.id);
    setAccountName(account.name);

    if (options?.linkDeal !== false) {
      if (deal) {
        setDealId(deal.id);
        setDealLabel(dealLinkLabel(deal));
      } else if (!defaultDealId) {
        setDealId(null);
        setDealLabel(null);
      }
    }

    setForm((f) => ({
      ...f,
      name: suggestedProjectName(account, deal),
      type: projectType,
      location_type: inferLocationType(siteAddress),
      site_address: siteAddress,
      client_notes: deal?.requirement_summary?.trim() || f.client_notes,
      projected_end: deal?.expected_installation_date
        ? dateInputValue(deal.expected_installation_date)
        : f.projected_end,
    }));

    const contactId = resolvePrimaryContactId(account, deal);
    if (contactId) {
      linkContact(account, deal, contactId, cancelledRef);
    } else {
      setContactId(null);
      setContactLabel(null);
    }
  }

  async function loadAccountDeals(accountId: number): Promise<ApiDeal[]> {
    const res = await fetchAccountDeals(accountId, { per_page: 50 });
    return res.data;
  }

  async function handleAccountSelected(
    account: ApiAccount,
    options?: { fromPicker?: boolean },
  ) {
    const cancelledRef = { current: false };

    let fullAccount = account;
    if (!account.contacts?.length && account.id) {
      try {
        fullAccount = await fetchAccount(account.id);
      } catch {
        /* use partial account from picker */
      }
    }

    setAccountId(fullAccount.id);
    setAccountName(fullAccount.name);

    let deal: ApiDeal | null = null;
    if (!defaultDealId) {
      try {
        const deals = await loadAccountDeals(fullAccount.id);
        deal = options?.fromPicker
          ? pickDealOnAccountChange(deals)
          : pickBestDealForAccount(deals);
        if (deal) {
          setDealId(deal.id);
          setDealLabel(dealLinkLabel(deal));
        } else {
          setDealId(null);
          setDealLabel(null);
        }
      } catch {
        setDealId(null);
        setDealLabel(null);
      }
    }

    applyAccountDealPrefill(fullAccount, deal, cancelledRef, {
      linkDeal: false,
    });
  }

  async function handleDealSelected(deal: ApiDeal) {
    const cancelledRef = { current: false };

    setDealId(deal.id);
    setDealLabel(dealLinkLabel(deal));

    let account: ApiAccount | null = deal.account ?? null;
    if (!account && deal.account_id) {
      try {
        account = await fetchAccount(deal.account_id);
      } catch {
        toast.error("Could not load account for this deal.");
      }
    }

    if (account) {
      setAccountId(account.id);
      setAccountName(account.name);
      applyAccountDealPrefill(account, deal, cancelledRef, { linkDeal: false });
    } else {
      const contactId = Number(deal.primary_contact_id ?? deal.contact_id);
      if (Number.isFinite(contactId)) {
        setContactId(contactId);
        if (deal.contact && Number(deal.contact.id) === contactId) {
          setContactLabel(contactDisplayName(deal.contact));
        } else {
          setContactLabel(`Contact #${contactId}`);
          void fetchContact(contactId)
            .then((contact) => {
              if (!cancelledRef.current) setContactLabel(contactDisplayName(contact));
            })
            .catch(() => {});
        }
      }

      const siteAddress = deal.site_address?.trim() || "";
      setForm((f) => ({
        ...f,
        name: dealDisplayName(deal),
        type:
          mapProductInterestsToProjectType(deal.product_interests) ?? f.type,
        location_type: inferLocationType(siteAddress),
        site_address: siteAddress || f.site_address,
        client_notes: deal.requirement_summary?.trim() || f.client_notes,
        projected_end: deal.expected_installation_date
          ? dateInputValue(deal.expected_installation_date)
          : f.projected_end,
      }));
    }
  }

  useEffect(() => {
    if (!defaultAccountId && !defaultDealId) {
      setPrefillLoading(false);
      return;
    }

    let cancelled = false;
    const cancelledRef = {
      get current() {
        return cancelled;
      },
      set current(v: boolean) {
        cancelled = v;
      },
    };

    async function loadPrefill() {
      setPrefillLoading(true);
      try {
        if (defaultDealId) {
          let deal: ApiDeal;
          try {
            deal = await fetchDeal(defaultDealId);
          } catch {
            if (!cancelled) {
              toast.error("Could not load deal details. You can still fill the form.");
            }
            return;
          }
          if (cancelled) return;

          setDealId(deal.id);
          setDealLabel(defaultDealLabel ?? dealLinkLabel(deal));

          const resolvedAccountId = deal.account_id ?? defaultAccountId;
          if (resolvedAccountId) {
            try {
              const account =
                deal.account ?? (await fetchAccount(resolvedAccountId));
              if (!cancelled) {
                applyAccountDealPrefill(account, deal, cancelledRef, {
                  linkDeal: false,
                });
              }
            } catch {
              if (!cancelled) {
                toast.error(
                  "Could not load account details. You can still fill the form.",
                );
              }
            }
          }
          return;
        }

        if (defaultAccountId) {
          const account = await fetchAccount(defaultAccountId);
          if (cancelled) return;

          let deal: ApiDeal | null = null;
          try {
            const deals = await loadAccountDeals(defaultAccountId);
            deal = pickBestDealForAccount(deals);
          } catch {
            /* deal link optional */
          }

          if (!cancelled) {
            if (deal) {
              setDealId(deal.id);
              setDealLabel(dealLinkLabel(deal));
            }
            applyAccountDealPrefill(account, deal, cancelledRef, {
              linkDeal: false,
            });
          }
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load account or deal details for this form.");
        }
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    }

    void loadPrefill();

    return () => {
      cancelled = true;
    };
  }, [defaultAccountId, defaultDealId, defaultDealLabel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    if (!accountId) {
      toast.error("Select an account for this project.");
      return;
    }

    setSaving(true);
    try {
      await ensureCsrfCookie();

      const payload: CreateProjectPayload = {
        name: form.name.trim(),
        account_id: accountId,
        deal_id: dealId,
        contact_id: contactId,
        type: form.type,
        location_type: form.location_type,
        site_address: form.site_address.trim() || undefined,
        priority: form.priority,
        overage_buffer_percent: form.overage_buffer_percent
          ? Number(form.overage_buffer_percent)
          : undefined,
        projected_start: form.projected_start || undefined,
        projected_end: form.projected_end || undefined,
        client_notes: form.client_notes.trim() || undefined,
        internal_notes: form.internal_notes.trim() || undefined,
      };

      const response = await createProject(payload);
      toast.success("Project created.");

      if (redirectTo === "pipeline") {
        router.push(projectPipelinePath(mode));
      } else {
        router.push(projectDetailPath(response.data.id, mode));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }

  if (prefillLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">Project name *</Label>
        <Input
          id="project-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Westlands Apartment Block A"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Account *</Label>
        <AccountPicker
          value={accountId}
          displayLabel={accountName}
          required
          disabled={!!defaultAccountId}
          onSelect={(account) => {
            void handleAccountSelected(account, { fromPicker: true });
          }}
          onClear={() => {
            if (defaultAccountId) return;
            setAccountId(null);
            setAccountName(null);
            setDealId(null);
            setDealLabel(null);
            setContactId(null);
            setContactLabel(null);
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label>Linked deal (optional)</Label>
        <DealPicker
          value={dealId}
          displayLabel={dealLabel}
          accountId={accountId}
          disabled={!accountId || !!defaultDealId}
          onSelect={(deal) => {
            void handleDealSelected(deal);
          }}
          onClear={() => {
            if (defaultDealId) return;
            setDealId(null);
            setDealLabel(null);
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label>Primary contact (optional)</Label>
        <ContactPicker
          value={contactId}
          displayLabel={contactLabel}
          accountId={accountId}
          disabled={!accountId}
          onSelect={(contact) => {
            setContactId(contact.id);
            setContactLabel(contactDisplayName(contact));
          }}
          onClear={() => {
            setContactId(null);
            setContactLabel(null);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Project type</Label>
          <Select
            value={form.type}
            onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="apartment_block">Apartment block</SelectItem>
              <SelectItem value="renovation">Renovation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Location scope</Label>
          <Select
            value={form.location_type}
            onValueChange={(value) => setForm((f) => ({ ...f, location_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nairobi">Nairobi (fabrication → full install)</SelectItem>
              <SelectItem value="outside_nairobi">Outside Nairobi (full install)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Nairobi projects are built in the workshop first, then installed on site. Outside
            Nairobi includes dispatch and on-site installation.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="site-address">Site address</Label>
        <Textarea
          id="site-address"
          value={form.site_address}
          onChange={(e) => {
            const siteAddress = e.target.value;
            setForm((f) => ({
              ...f,
              site_address: siteAddress,
              location_type: inferLocationType(siteAddress),
            }));
          }}
          rows={2}
          placeholder="Installation or delivery address"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(value) => setForm((f) => ({ ...f, priority: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="apartment_block">Apartment block</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="overage-buffer">Overage buffer %</Label>
          <Input
            id="overage-buffer"
            type="number"
            min={0}
            max={100}
            value={form.overage_buffer_percent}
            onChange={(e) =>
              setForm((f) => ({ ...f, overage_buffer_percent: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="projected-start">Projected start</Label>
          <Input
            id="projected-start"
            type="date"
            value={form.projected_start}
            onChange={(e) => setForm((f) => ({ ...f, projected_start: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="projected-end">Projected end</Label>
          <Input
            id="projected-end"
            type="date"
            value={form.projected_end}
            onChange={(e) => setForm((f) => ({ ...f, projected_end: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="client-notes">Client / scope notes</Label>
        <Textarea
          id="client-notes"
          value={form.client_notes}
          onChange={(e) => setForm((f) => ({ ...f, client_notes: e.target.value }))}
          rows={3}
          placeholder="Scope summary, client requirements, special instructions"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="internal-notes">Internal notes</Label>
        <Textarea
          id="internal-notes"
          value={form.internal_notes}
          onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Project"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
