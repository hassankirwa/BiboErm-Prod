"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKesFull } from "@/lib/leads-kanban-data";
import { useCrmLead } from "@/lib/use-crm-lead";
import { convertLead } from "@/lib/api/crm/leads";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { Field, FormSection } from "@/components/crm/lead-form-ui";
import { CrmRecordDetailShell } from "@/components/crm/crm-record-detail-shell";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

function leadsBackHref(view: string | null, leadId: string) {
  const v =
    view && ["list", "kanban", "calendar", "map"].includes(view) ? view : "list";
  const q = v ? `?view=${v}` : "";
  return `/crm/leads/${leadId}${q}`;
}

type ConvertForm = {
  accountName: string;
};

export function LeadConvertForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { can } = usePermissions();
  const { card: lead, loading, error } = useCrmLead(leadId);
  const [form, setForm] = useState<ConvertForm | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!lead) {
      setForm(null);
      return;
    }
    setForm({
      accountName: lead.company || lead.title,
    });
  }, [lead]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !lead || !form) {
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

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <CrmRecordDetailShell
      backHref={leadsBackHref(view, leadId)}
      backLabel="Back to lead"
      recordTitle={`Provision account — ${lead.title}`}
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
          Source lead value: {formatKesFull(lead.estimatedValue)} · Owner:{" "}
          {lead.owner}
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
      <form onSubmit={handleSubmit} className="space-y-5">
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
              value={form.accountName}
              onChange={(e) =>
                setForm((current) =>
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
