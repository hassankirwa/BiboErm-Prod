"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { leadKanbanStages } from "@/lib/leads-kanban-data";
import {
  emptyLeadForm,
  type LeadFormValues,
} from "@/lib/lead-form-config";
import { LeadFormFields } from "@/components/crm/lead-form-ui";
import { createLead } from "@/lib/api/crm/leads";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

export function LeadCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnView = searchParams.get("view");
  const leadsHref =
    returnView && ["list", "kanban", "calendar", "map"].includes(returnView)
      ? `/crm/leads?view=${returnView}`
      : "/crm/leads?view=list";

  const [form, setForm] = useState<LeadFormValues>(() => emptyLeadForm());
  const [submitting, setSubmitting] = useState(false);

  const stage = leadKanbanStages.find((s) => s.id === form.stageId);

  const update = <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    try {
      await ensureCsrfCookie();
      const lead = await createLead({
        name: form.title.trim(),
        contact_person_name: form.title.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        account_name: form.company.trim() || null,
        site_address: form.location.trim() || null,
        requirement_description: form.notes.trim() || form.title.trim(),
        product_interests: [],
        estimated_value: form.estimatedValue || undefined,
      });
      router.push(`/crm/leads/${lead.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create lead.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href={leadsHref}>
            <ArrowLeft className="h-4 w-4" />
            Leads
          </Link>
        </Button>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-sm font-medium text-foreground">Create lead</span>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-[#1e3a5f]/[0.06] via-transparent to-transparent px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {stage && (
                <Badge className={cn("border-0 font-medium", stage.tagClass)}>
                  {stage.label}
                </Badge>
              )}
              {form.tag && (
                <Badge variant="outline" className="font-normal">
                  {form.tag}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1e3a5f] sm:text-2xl">
              New lead
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Fill in the details below to add a lead to your pipeline. Required
              fields are marked with an asterisk.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <Card className="gap-0 py-0 shadow-sm">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm text-[#1e3a5f]">
                <Sparkles className="h-4 w-4" />
                Quick tips
              </CardTitle>
              <CardDescription className="text-xs">
                Get the most from each new lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 py-4 text-xs text-muted-foreground">
              <p>
                Use a clear lead name and location so your team can find it on
                the map and Kanban board.
              </p>
              <p>
                Set the stage and next action date to keep follow-ups on track.
              </p>
              <p>
                Estimated value helps prioritize high-impact opportunities.
              </p>
            </CardContent>
          </Card>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-5">
          <LeadFormFields form={form} update={update} />

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-5 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <p className="text-sm text-muted-foreground">
              Fields marked * are required
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href={leadsHref}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create lead"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
