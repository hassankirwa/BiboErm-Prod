"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { leadKanbanStages } from "@/lib/leads-kanban-data";
import { apiLeadToFormValues, cardToFormValues } from "@/lib/lead-form-utils";
import type { LeadFormValues } from "@/lib/lead-form-config";
import { useCrmLead } from "@/lib/use-crm-lead";
import { fetchLead, updateLead } from "@/lib/api/crm/leads";
import { leadFormToUpdatePayload } from "@/lib/crm-lead-payload";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { LeadFormFields } from "@/components/crm/lead-form-ui";
import { CrmRecordDetailShell } from "@/components/crm/crm-record-detail-shell";
import { toast } from "sonner";

function leadsBackHref(view: string | null, leadId: string) {
  const v =
    view && ["list", "kanban", "calendar", "map"].includes(view) ? view : "list";
  const q = v ? `?view=${v}` : "";
  return `/crm/leads/${leadId}${q}`;
}

export function LeadEditForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { card: lead, loading, error } = useCrmLead(leadId);
  const { lookups } = useCrmFormLookups({
    assignableRole: "sales_representative",
  });
  const [form, setForm] = useState<LeadFormValues | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(leadId);
    if (!Number.isFinite(id) || id <= 0) return;
    fetchLead(id)
      .then((detail) => setForm(apiLeadToFormValues(detail)))
      .catch(() => {
        if (lead) setForm(cardToFormValues(lead));
      });
  }, [leadId, lead]);

  const stage = leadKanbanStages.find((s) => s.id === form?.stageId);

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

  const update = <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await ensureCsrfCookie();
      await updateLead(Number(leadId), {
        ...leadFormToUpdatePayload(form, { counties: lookups?.counties }),
        need_site_visit: form.needSiteVisit,
      });
      toast.success("Lead updated.");
      router.push(leadsBackHref(view, leadId));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update lead.",
      );
      setSaving(false);
    }
  };

  return (
    <CrmRecordDetailShell
      backHref={leadsBackHref(view, leadId)}
      backLabel="Back to lead"
      recordTitle={`Edit — ${lead.title}`}
      headerBadges={
        stage ? (
          <Badge className={cn("border-0 font-medium", stage.tagClass)}>
            {stage.label}
          </Badge>
        ) : null
      }
      actions={
        <Button variant="outline" size="sm" className="h-9" asChild>
          <Link href={leadsBackHref(view, leadId)}>Cancel</Link>
        </Button>
      }
      sidebar={
        <div className="rounded-lg border border-border bg-[#ebf2ff]/20 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-[#1e3a5f]">Editing lead</p>
          <p className="mt-2">
            Changes are saved to the server and reflected across all views.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <LeadFormFields form={form} update={update} />
        <div className="flex justify-end gap-2 rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
          <Button type="button" variant="outline" asChild>
            <Link href={leadsBackHref(view, leadId)}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </CrmRecordDetailShell>
  );
}
