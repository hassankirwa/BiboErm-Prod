"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatKesFull, leadKanbanAssignees } from "@/lib/leads-kanban-data";
import { useLeadById } from "@/lib/leads-state";
import { Field, FormSection } from "@/components/crm/lead-form-ui";
import { CrmRecordDetailShell } from "@/components/crm/crm-record-detail-shell";

function leadsBackHref(view: string | null, leadId: string) {
  const v =
    view && ["list", "kanban", "calendar", "map"].includes(view) ? view : "list";
  const q = v ? `?view=${v}` : "";
  return `/crm/leads/${leadId}${q}`;
}

type ConvertForm = {
  convertAs: "deal" | "account";
  dealName: string;
  accountName: string;
  amount: number;
  closingDate: string;
  owner: string;
  stage: string;
};

function buildConvertForm(lead: {
  title: string;
  company?: string;
  estimatedValue: number;
  nextActionDate: string;
  owner: string;
}): ConvertForm {
  return {
    convertAs: "deal",
    dealName: `${lead.title} — Deal`,
    accountName: lead.company || lead.title,
    amount: lead.estimatedValue,
    closingDate: lead.nextActionDate,
    owner: lead.owner,
    stage: "Qualification",
  };
}

export function LeadConvertForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const lead = useLeadById(leadId);
  const [form, setForm] = useState<ConvertForm | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!lead) {
      setForm(null);
      return;
    }
    setForm((prev) => prev ?? buildConvertForm(lead));
  }, [leadId, lead]);

  if (!lead || !form) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Lead not found.
      </div>
    );
  }

  const update = <K extends keyof ConvertForm>(
    key: K,
    value: ConvertForm[K]
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConverting(true);
    window.setTimeout(() => {
      router.push(`/crm/deals?view=list`);
    }, 400);
  };

  return (
    <CrmRecordDetailShell
      backHref={leadsBackHref(view, leadId)}
      backLabel="Back to lead"
      recordTitle={`Convert — ${lead.title}`}
      headerBadges={
        <Badge
          variant="outline"
          className="border-[#1e3a5f]/20 bg-[#ebf2ff]/40 font-normal text-[#1e3a5f]"
        >
          Converting lead
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
              Lead summary
            </p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Company:</span>{" "}
                {lead.company || "—"}
              </li>
              <li>
                <span className="font-medium text-foreground">Location:</span>{" "}
                {lead.location}
              </li>
              <li>
                <span className="font-medium text-foreground">Email:</span>{" "}
                {lead.email || "—"}
              </li>
            </ul>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection
          title="Conversion type"
          description="Choose what to create from this lead"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => update("convertAs", "deal")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                form.convertAs === "deal"
                  ? "border-[#1e3a5f] bg-[#ebf2ff] text-[#1e3a5f]"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/30"
              )}
            >
              <Handshake className="h-4 w-4" />
              Convert to Deal
            </button>
            <button
              type="button"
              onClick={() => update("convertAs", "account")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                form.convertAs === "account"
                  ? "border-[#1e3a5f] bg-[#ebf2ff] text-[#1e3a5f]"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/30"
              )}
            >
              <Building2 className="h-4 w-4" />
              Convert to Account
            </button>
          </div>
        </FormSection>

        <FormSection
          title={form.convertAs === "deal" ? "Deal details" : "Account details"}
          description="Review and adjust fields before converting"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {form.convertAs === "deal" ? (
              <Field label="Deal name" required className="sm:col-span-2">
                <Input
                  value={form.dealName}
                  onChange={(e) => update("dealName", e.target.value)}
                  required
                  className="h-9"
                />
              </Field>
            ) : (
              <Field label="Account name" required className="sm:col-span-2">
                <Input
                  value={form.accountName}
                  onChange={(e) => update("accountName", e.target.value)}
                  required
                  className="h-9"
                />
              </Field>
            )}
            <Field label="Amount (KES)">
              <Input
                type="number"
                min={0}
                value={form.amount || ""}
                onChange={(e) =>
                  update("amount", Number(e.target.value) || 0)
                }
                className="h-9"
              />
            </Field>
            <Field label="Closing date">
              <Input
                type="date"
                value={form.closingDate}
                onChange={(e) => update("closingDate", e.target.value)}
                className="h-9"
              />
            </Field>
            <Field label="Owner">
              <Select
                value={form.owner}
                onValueChange={(v) => update("owner", v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {leadKanbanAssignees.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.convertAs === "deal" && (
              <Field label="Deal stage">
                <Select
                  value={form.stage}
                  onValueChange={(v) => update("stage", v)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Qualification",
                      "Needs Analysis",
                      "Proposal",
                      "Negotiation",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            The lead will be marked converted after you confirm.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={leadsBackHref(view, leadId)}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={converting}>
              {converting ? "Converting…" : "Convert lead"}
            </Button>
          </div>
        </div>
      </form>
    </CrmRecordDetailShell>
  );
}
