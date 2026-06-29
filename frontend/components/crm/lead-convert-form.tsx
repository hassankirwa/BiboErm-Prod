"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatKesFull } from "@/lib/leads-kanban-data";
import { useCrmLead } from "@/lib/use-crm-lead";
import { convertLead } from "@/lib/api/crm/leads";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { Field, FormSection } from "@/components/crm/lead-form-ui";
import { CrmRecordDetailShell } from "@/components/crm/crm-record-detail-shell";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import {
  canCreateDealAfterDeposit,
  canProvisionAccountFromLead,
  canRecordDepositAndCreateDeal,
  dealIsWon,
  hasApprovedSiteVisit,
  hasProvisionedAccount,
  hasQuotationSentToClient,
  hasRecordedDeposit,
} from "@/lib/crm-lead-status";
import { toast } from "sonner";

function leadsBackHref(view: string | null, leadId: string) {
  const v =
    view && ["list", "kanban", "calendar", "map"].includes(view) ? view : "list";
  const q = v ? `?view=${v}` : "";
  return `/crm/leads/${leadId}${q}`;
}

type ProvisionForm = {
  accountName: string;
};

type DepositForm = {
  payment_reference: string;
  payment_date: string;
  amount_paid: string;
  payment_method: string;
  notes: string;
};

export function LeadConvertForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { can } = usePermissions();
  const { lead, card, loading, error } = useCrmLead(leadId);
  const [provisionForm, setProvisionForm] = useState<ProvisionForm | null>(null);
  const [depositForm, setDepositForm] = useState<DepositForm>({
    payment_reference: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount_paid: "",
    payment_method: "mpesa",
    notes: "",
  });
  const [converting, setConverting] = useState(false);

  const linkedAccountId =
    lead?.converted_account_id ?? lead?.converted_account?.id ?? null;
  const salesDeal = lead?.sales_deal ?? lead?.converted_deal ?? null;
  const hasDeal = Boolean(salesDeal?.id ?? lead?.converted_deal_id);
  const depositRecorded = hasRecordedDeposit(salesDeal);
  const commercialInput = {
    hasLinkedAccount: Boolean(linkedAccountId),
    hasDeal,
    hasRecordedDeposit: depositRecorded,
    hasApprovedSiteVisit: hasApprovedSiteVisit(lead?.site_visits),
    hasSentQuotation: hasQuotationSentToClient(lead?.latest_quotation),
    dealWon: dealIsWon(salesDeal),
  };
  const depositAndDealMode = canRecordDepositAndCreateDeal(commercialInput);
  const finalizeDealMode = canCreateDealAfterDeposit(commercialInput);
  const commercialMode = depositAndDealMode || finalizeDealMode;
  const provisionMode =
    !commercialMode &&
    canProvisionAccountFromLead(lead?.status, Boolean(linkedAccountId));

  useEffect(() => {
    if (!lead) {
      setProvisionForm(null);
      return;
    }
    setProvisionForm({
      accountName: lead.company || lead.title,
    });
    const suggested =
      salesDeal?.deposit_required_amount ??
      lead.latest_quotation?.total_amount ??
      null;
    if (suggested != null && !depositForm.amount_paid) {
      setDepositForm((f) => ({
        ...f,
        amount_paid: String(suggested),
      }));
    }
  }, [lead, salesDeal?.deposit_required_amount, lead?.latest_quotation?.total_amount]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !lead || !provisionForm) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {error ?? "Lead not found."}
      </div>
    );
  }

  if (!can("leads.convert")) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        You do not have permission to convert leads.
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={leadsBackHref(view, leadId)}>Back to lead</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!commercialMode && !provisionMode) {
    const readinessBlockers: string[] = [];
    if (linkedAccountId && !depositRecorded) {
      if (!hasApprovedSiteVisit(lead.site_visits)) {
        readinessBlockers.push(
          "Complete and approve a site visit with measurements first.",
        );
      } else if (!hasQuotationSentToClient(lead.latest_quotation)) {
        readinessBlockers.push(
          "Create a project quotation from the measurements and send it to the client first.",
        );
      }
    }

    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {hasProvisionedAccount(lead.status) && depositRecorded
          ? "This lead has already been converted with a deposit recorded."
          : readinessBlockers[0] ??
            "This lead cannot be converted in its current state."}
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={leadsBackHref(view, leadId)}>Back to lead</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConverting(true);
    try {
      await ensureCsrfCookie();
      const result = await convertLead(Number(leadId), {
        create_contact: true,
        create_account: true,
        create_deal: false,
      });
      toast.success("Account provisioned from lead.");
      const accountId = result.data.account?.id;
      router.push(
        accountId ? `/crm/accounts/${accountId}` : leadsBackHref(view, leadId),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to convert lead.",
      );
      setConverting(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConverting(true);
    try {
      await ensureCsrfCookie();

      if (finalizeDealMode) {
        const result = await convertLead(Number(leadId), {
          quotation_id: lead.latest_quotation?.id,
        });
        toast.success("Deal created from recorded deposit.");
        const dealId = result.data.deal?.id;
        router.push(
          dealId ? `/crm/deals/${dealId}` : leadsBackHref(view, leadId),
        );
        return;
      }

      const amount = parseFloat(depositForm.amount_paid);
      if (
        !depositForm.payment_reference.trim() ||
        Number.isNaN(amount) ||
        amount <= 0
      ) {
        toast.error("Enter a valid payment reference and amount.");
        setConverting(false);
        return;
      }

      const result = await convertLead(Number(leadId), {
        quotation_id: lead.latest_quotation?.id,
        payment_reference: depositForm.payment_reference.trim(),
        payment_date: depositForm.payment_date,
        amount_paid: amount,
        payment_method: depositForm.payment_method,
        payment_status: "confirmed",
        notes: depositForm.notes.trim() || undefined,
      });
      toast.success("Deposit recorded and deal created.");
      const dealId = result.data.deal?.id;
      router.push(
        dealId ? `/crm/deals/${dealId}` : leadsBackHref(view, leadId),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to complete conversion.",
      );
      setConverting(false);
    }
  };

  if (commercialMode) {
    return (
      <CrmRecordDetailShell
        backHref={leadsBackHref(view, leadId)}
        backLabel="Back to lead"
        recordTitle={
          finalizeDealMode
            ? `Create deal — ${card?.title ?? leadId}`
            : `Record deposit — ${card?.title ?? leadId}`
        }
        headerBadges={
          <Badge
            variant="outline"
            className="border-[#1e3a5f]/20 bg-[#ebf2ff]/40 font-normal text-[#1e3a5f]"
          >
            {finalizeDealMode ? "Create deal" : "Deposit & deal"}
          </Badge>
        }
        recordMeta={
          <p className="text-sm text-muted-foreground">
            {lead.latest_quotation?.quotation_number
              ? `Quotation ${lead.latest_quotation.quotation_number}`
              : "No quotation linked"}{" "}
            · Owner: {card?.owner ?? "—"}
          </p>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9" asChild>
            <Link href={leadsBackHref(view, leadId)}>Cancel</Link>
          </Button>
        }
        sidebar={
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1e3a5f]">
                v2 flow
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {finalizeDealMode
                  ? "Deposit is already recorded. This step accepts the quotation, marks the deal won, and links it to the lead."
                  : "Account already exists. This step creates a deal from the latest quotation and records the client deposit."}
              </p>
            </div>
            {linkedAccountId ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/crm/accounts/${linkedAccountId}`}>Open account</Link>
              </Button>
            ) : null}
          </div>
        }
      >
        <form onSubmit={handleDepositSubmit} className="space-y-5">
          <FormSection
            title={finalizeDealMode ? "Finalize deal" : "Deposit payment"}
            description={
              finalizeDealMode
                ? "Confirm deal creation from the recorded deposit"
                : "Record the client deposit and create the sales deal"
            }
          >
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
              <Banknote className="h-4 w-4 text-[#1e3a5f]" />
              {finalizeDealMode
                ? `Deposit recorded (${salesDeal?.deposit_paid_amount ?? salesDeal?.deposit_amount ?? "—"} KES). No additional payment is required.`
                : hasDeal
                  ? "Deal exists — deposit will be recorded on the linked deal."
                  : "A deal will be created from the latest quotation when you submit."}
            </div>
            {!finalizeDealMode ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="convert-payment-ref">Payment reference</Label>
                <Input
                  id="convert-payment-ref"
                  value={depositForm.payment_reference}
                  onChange={(e) =>
                    setDepositForm((f) => ({
                      ...f,
                      payment_reference: e.target.value,
                    }))
                  }
                  placeholder="e.g. MPESA-ABC123"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="convert-payment-date">Payment date</Label>
                <Input
                  id="convert-payment-date"
                  type="date"
                  value={depositForm.payment_date}
                  onChange={(e) =>
                    setDepositForm((f) => ({ ...f, payment_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="convert-payment-amount">Amount (KES)</Label>
                <Input
                  id="convert-payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositForm.amount_paid}
                  onChange={(e) =>
                    setDepositForm((f) => ({ ...f, amount_paid: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Payment method</Label>
                <Select
                  value={depositForm.payment_method}
                  onValueChange={(value) =>
                    setDepositForm((f) => ({ ...f, payment_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="convert-payment-notes">Notes (optional)</Label>
                <Textarea
                  id="convert-payment-notes"
                  value={depositForm.notes}
                  onChange={(e) =>
                    setDepositForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            </div>
            ) : null}
          </FormSection>

          <Button
            type="submit"
            disabled={
              converting ||
              (!finalizeDealMode && !can("deal_payments.record"))
            }
          >
            {converting
              ? finalizeDealMode
                ? "Creating…"
                : "Recording…"
              : finalizeDealMode
                ? "Create deal"
                : "Record deposit & create deal"}
          </Button>
          {!finalizeDealMode && !can("deal_payments.record") ? (
            <p className="text-xs text-muted-foreground">
              You need deal payment permission to complete this step.
            </p>
          ) : null}
        </form>
      </CrmRecordDetailShell>
    );
  }

  return (
    <CrmRecordDetailShell
      backHref={leadsBackHref(view, leadId)}
      backLabel="Back to lead"
      recordTitle={`Provision account — ${card?.title ?? leadId}`}
      headerBadges={
        <Badge
          variant="outline"
          className="border-[#1e3a5f]/20 bg-[#ebf2ff]/40 font-normal text-[#1e3a5f]"
        >
          Account provisioning
        </Badge>
      }
      recordMeta={
        <p className="text-sm text-muted-foreground">
          Source lead value: {formatKesFull(card?.estimatedValue ?? 0)} · Owner:{" "}
          {card?.owner ?? "—"}
        </p>
      }
      actions={
        <Button variant="outline" size="sm" className="h-9" asChild>
          <Link href={leadsBackHref(view, leadId)}>Cancel</Link>
        </Button>
      }
      sidebar={
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1e3a5f]">
              v2 flow
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Deals are created when a quotation is sent from the account.
              This step only ensures the account and contact exist.
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleProvisionSubmit} className="space-y-5">
        <FormSection
          title="Account + contact"
          description="Creates the client workspace for quotation and site visit work"
        >
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
            <Building2 className="h-4 w-4 text-[#1e3a5f]" />
            Account and contact will be created from lead details.
          </div>
          <Field label="Account name (reference)">
            <Input
              value={provisionForm.accountName}
              onChange={(e) =>
                setProvisionForm((current) =>
                  current ? { ...current, accountName: e.target.value } : current,
                )
              }
              placeholder="Client or site name"
            />
          </Field>
        </FormSection>

        <Button type="submit" disabled={converting}>
          {converting ? "Provisioning…" : "Create account & contact"}
        </Button>
      </form>
    </CrmRecordDetailShell>
  );
}
