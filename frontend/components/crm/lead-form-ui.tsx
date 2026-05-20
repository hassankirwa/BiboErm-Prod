"use client";

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
import { cn } from "@/lib/utils";
import {
  leadKanbanAssignees,
  leadKanbanStages,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";
import {
  leadSourceOptions,
  tagOptions,
  type LeadFormValues,
} from "@/lib/lead-form-config";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[#1e3a5f]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export function LeadFormFields({
  form,
  update,
}: {
  form: LeadFormValues;
  update: <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K]
  ) => void;
}) {
  return (
    <>
      <FormSection
        title="Contact information"
        description="How to reach this prospect"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead name" required className="sm:col-span-2">
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Kilimani Apartment"
              required
              className="h-9"
            />
          </Field>
          <Field label="Company">
            <Input
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="Company or client name"
              className="h-9"
            />
          </Field>
          <Field label="Location" required>
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Kilimani, Nairobi"
              required
              className="h-9"
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="0712 345 678"
              className="h-9"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="name@company.co.ke"
              className="h-9"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Lead details"
        description="Pipeline stage, source, and commercial info"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead source">
            <Select
              value={form.source}
              onValueChange={(v) => update("source", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadSourceOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Stage">
            <Select
              value={form.stageId}
              onValueChange={(v) => update("stageId", v as LeadKanbanStageId)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadKanbanStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Owner">
            <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
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
          <Field label="Estimated value (KES)">
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.estimatedValue || ""}
              onChange={(e) =>
                update("estimatedValue", Number(e.target.value) || 0)
              }
              placeholder="950000"
              className="h-9"
            />
          </Field>
          <Field label="Next action date">
            <Input
              type="date"
              value={form.nextActionDate}
              onChange={(e) => update("nextActionDate", e.target.value)}
              className="h-9"
            />
          </Field>
          <Field label="Tag">
            <Select value={form.tag} onValueChange={(v) => update("tag", v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tagOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Notes"
        description="Internal context and follow-up reminders"
      >
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Add notes about requirements, conversations, or next steps…"
          rows={5}
          className="min-h-[120px] resize-none"
        />
      </FormSection>
    </>
  );
}
