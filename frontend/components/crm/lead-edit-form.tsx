"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { leadKanbanStages } from "@/lib/leads-kanban-data";
import { cardToFormValues, type LeadFormValues } from "@/lib/lead-form-utils";
import { updateLead, useLeadById } from "@/lib/leads-state";
import { LeadFormFields } from "@/components/crm/lead-form-ui";
import { CrmRecordDetailShell } from "@/components/crm/crm-record-detail-shell";

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
  const lead = useLeadById(leadId);
  const [form, setForm] = useState<LeadFormValues | null>(null);

  useEffect(() => {
    if (!lead) {
      setForm(null);
      return;
    }
    setForm((prev) => prev ?? cardToFormValues(lead));
  }, [leadId, lead]);

  const stage = leadKanbanStages.find((s) => s.id === form?.stageId);

  if (!lead || !form) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Lead not found.
      </div>
    );
  }

  const update = <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K]
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.location.trim()) return;
    updateLead(leadId, {
      title: form.title.trim(),
      company: form.company.trim() || undefined,
      location: form.location.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      source: form.source,
      stageId: form.stageId,
      owner: form.owner,
      estimatedValue: form.estimatedValue,
      nextActionDate: form.nextActionDate,
      tag: form.tag,
      notes: form.notes.trim() || undefined,
    });
    router.push(leadsBackHref(view, leadId));
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
            Changes are saved to your pipeline and reflected in list, Kanban,
            calendar, and map views.
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
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </CrmRecordDetailShell>
  );
}
