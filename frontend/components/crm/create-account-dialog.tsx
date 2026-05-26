"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { LeadPicker } from "@/components/crm/lead-picker";
import { createAccount } from "@/lib/api/crm/accounts";
import { fetchLead, leadDisplayName } from "@/lib/api/crm/leads";
import { isLeadQualifiedForAccount } from "@/lib/crm-lead-status";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  EMPTY_ACCOUNT_FORM,
  mapLeadToAccountForm,
} from "@/lib/crm-lead-to-account";
import type { ApiAccount } from "@/lib/api/crm/types";
import { toast } from "sonner";

type CreateAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (account: ApiAccount) => void;
};

export function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAccountDialogProps) {
  const [saving, setSaving] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadLabel, setSelectedLeadLabel] = useState<string | null>(
    null,
  );
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState(EMPTY_ACCOUNT_FORM);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_ACCOUNT_FORM);
      setSelectedLeadId(null);
      setSelectedLeadLabel(null);
      setSelectedLeadStatus(null);
      setLoadingLead(false);
    }
  }, [open]);

  async function handleLeadSelect(lead: { id: number }) {
    setSelectedLeadId(lead.id);
    setLoadingLead(true);
    try {
      const detail = await fetchLead(lead.id);
      if (!isLeadQualifiedForAccount(detail.status)) {
        setSelectedLeadId(null);
        setSelectedLeadLabel(null);
        setSelectedLeadStatus(null);
        toast.error(
          "Account can only be created from a qualified lead or later stage.",
        );
        return;
      }
      const mapped = mapLeadToAccountForm(detail);
      setForm(mapped);
      setSelectedLeadLabel(leadDisplayName(detail));
      setSelectedLeadStatus(detail.status);
    } catch (err) {
      setSelectedLeadId(null);
      setSelectedLeadLabel(null);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load lead details.",
      );
    } finally {
      setLoadingLead(false);
    }
  }

  function handleLeadClear() {
    setSelectedLeadId(null);
    setSelectedLeadLabel(null);
    setSelectedLeadStatus(null);
    setForm(EMPTY_ACCOUNT_FORM);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (selectedLeadId && !isLeadQualifiedForAccount(selectedLeadStatus)) {
      toast.error(
        "Account can only be created from a qualified lead or later stage.",
      );
      return;
    }
    setSaving(true);
    try {
      await ensureCsrfCookie();
      const account = await createAccount({
        name: form.name.trim(),
        account_type: form.account_type.trim() || undefined,
        industry: form.industry.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        kra_pin: form.kra_pin.trim() || undefined,
        billing_address: form.billing_address.trim() || undefined,
        physical_address: form.physical_address.trim() || undefined,
        county_id: form.county_id ?? undefined,
        status: form.status || undefined,
        account_owner_id: form.account_owner_id ?? undefined,
        source_lead_id: form.source_lead_id ?? undefined,
      });
      toast.success("Account created.");
      onOpenChange(false);
      onCreated?.(account);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create account.",
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldsDisabled = saving || loadingLead;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Select lead (optional, qualified only)</Label>
            <LeadPicker
              value={selectedLeadId}
              displayLabel={selectedLeadLabel}
              onSelect={handleLeadSelect}
              onClear={handleLeadClear}
              disabled={fieldsDisabled}
            />
            {loadingLead ? (
              <p className="text-xs text-muted-foreground">
                Loading lead details…
              </p>
            ) : selectedLeadId ? (
              <p className="text-xs text-muted-foreground">
                Fields below were filled from the selected lead. You can edit
                them before saving.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-name">Name *</Label>
            <Input
              id="account-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              required
              disabled={fieldsDisabled}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="account-type">Account type</Label>
              <Input
                id="account-type"
                value={form.account_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, account_type: e.target.value }))
                }
                disabled={fieldsDisabled}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-industry">Industry</Label>
              <Input
                id="account-industry"
                value={form.industry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, industry: e.target.value }))
                }
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="account-phone">Phone</Label>
              <Input
                id="account-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                disabled={fieldsDisabled}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="account-website">Website</Label>
              <Input
                id="account-website"
                value={form.website}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website: e.target.value }))
                }
                disabled={fieldsDisabled}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-kra-pin">KRA PIN</Label>
              <Input
                id="account-kra-pin"
                value={form.kra_pin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kra_pin: e.target.value }))
                }
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-billing-address">Billing address</Label>
            <Textarea
              id="account-billing-address"
              value={form.billing_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, billing_address: e.target.value }))
              }
              rows={2}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-physical-address">Physical address</Label>
            <Textarea
              id="account-physical-address"
              value={form.physical_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, physical_address: e.target.value }))
              }
              rows={2}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, status: value }))
              }
              disabled={fieldsDisabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active_opportunity">
                  Active Opportunity
                </SelectItem>
                <SelectItem value="active_customer">Active Customer</SelectItem>
                <SelectItem value="repeat_customer">Repeat Customer</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={fieldsDisabled}>
              {saving ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
