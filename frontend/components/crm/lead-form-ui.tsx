"use client";

import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  leadKanbanStages,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";
import {
  priorityOptions,
  preferredContactMethodOptions,
  propertySiteTypeOptions,
  tagOptions,
  urgencyOptions,
  type LeadFormValues,
} from "@/lib/lead-form-config";
import { KENYA_COUNTIES, getSubCountiesForCounty } from "@/lib/kenya-locations";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import { useEffect, useState } from "react";

const MapPinPicker = dynamic(
  () =>
    import("@/components/crm/map-pin-picker").then((m) => m.MapPinPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 items-center justify-center rounded-lg border border-border bg-muted/20">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    ),
  },
);

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
      <SectionHeader title={title} description={description} />
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
      <h2 className="text-sm font-semibold text-[#1e3a5f]">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  className,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ProductInterestPicker({
  options,
  selected,
  onChange,
}: {
  options: { slug: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (slug: string) => {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.slug);
        return (
          <button
            key={option.slug}
            type="button"
            onClick={() => toggle(option.slug)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function LeadFormFields({
  form,
  update,
  variant = "page",
}: {
  form: LeadFormValues;
  update: <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) => void;
  variant?: "page" | "modal";
}) {
  const { lookups, assignableUsers, loading, error } = useCrmFormLookups({
    assignableRole: "sales_representative",
  });
  const [fieldOfficers, setFieldOfficers] = useState<
    { id: number; name: string }[]
  >([]);

  useEffect(() => {
    fetchCrmAssignableUsers({ role: "field_officer" })
      .then((res) =>
        setFieldOfficers(res.data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => setFieldOfficers([]));
  }, []);

  const leadSources = lookups?.lead_sources ?? [];
  const leadTypes = lookups?.lead_types ?? [];
  const productInterests = lookups?.product_interests ?? [];
  const subCounties = getSubCountiesForCounty(form.countySlug);

  if (loading && !lookups) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const leadInfo = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Lead / site name" required className="sm:col-span-2">
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Westlands Office Tower (upcoming)"
          required
          className="h-9"
        />
      </Field>
      <Field label="Lead type">
        <Select
          value={form.leadTypeId ? String(form.leadTypeId) : undefined}
          onValueChange={(v) =>
            update("leadTypeId", v ? Number(v) : null)
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {leadTypes.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Lead source">
        <Select
          value={form.leadSourceId ? String(form.leadSourceId) : undefined}
          onValueChange={(v) =>
            update("leadSourceId", v ? Number(v) : null)
          }
          disabled={leadSources.length === 0}
        >
          <SelectTrigger className="h-9">
            <SelectValue
              placeholder={
                error
                  ? "Could not load sources"
                  : leadSources.length === 0
                    ? "No sources configured"
                    : "Select source"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {leadSources.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.label}
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
        <Select
          value={form.ownerId ? String(form.ownerId) : undefined}
          onValueChange={(v) => update("ownerId", v ? Number(v) : null)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            {assignableUsers.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Priority">
        <Select
          value={form.priority || undefined}
          onValueChange={(v) => update("priority", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <Field label="Next action date">
        <Input
          type="date"
          value={form.nextActionDate}
          onChange={(e) => update("nextActionDate", e.target.value)}
          className="h-9"
        />
      </Field>
    </div>
  );

  const contactSection = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Contact person name" className="sm:col-span-2">
        <Input
          value={form.contactPersonName}
          onChange={(e) => update("contactPersonName", e.target.value)}
          placeholder="Optional — add when known"
          className="h-9"
        />
      </Field>
      <Field label="Company / account">
        <Input
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
          placeholder="Developer or client name"
          className="h-9"
        />
      </Field>
      <Field label="Job title">
        <Input
          value={form.jobTitle}
          onChange={(e) => update("jobTitle", e.target.value)}
          placeholder="e.g. Project Manager"
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
      <Field label="WhatsApp">
        <Input
          type="tel"
          value={form.whatsapp}
          onChange={(e) => update("whatsapp", e.target.value)}
          placeholder="Same as phone if applicable"
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
      <Field label="Preferred contact method">
        <Select
          value={form.preferredContactMethod || undefined}
          onValueChange={(v) => update("preferredContactMethod", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {preferredContactMethodOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Preferred contact time">
        <Input
          value={form.preferredContactTime}
          onChange={(e) => update("preferredContactTime", e.target.value)}
          placeholder="e.g. Weekday mornings"
          className="h-9"
        />
      </Field>
    </div>
  );

  const locationSection = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Site name" className="sm:col-span-2">
          <Input
            value={form.siteName}
            onChange={(e) => update("siteName", e.target.value)}
            placeholder="Building or project name on site"
            className="h-9"
          />
        </Field>
        <Field label="Street / site address" className="sm:col-span-2">
          <Input
            value={form.siteAddress}
            onChange={(e) => {
              update("siteAddress", e.target.value);
              update("location", e.target.value);
            }}
            placeholder="Road, plot, or landmark directions"
            className="h-9"
          />
        </Field>
        <Field label="County">
          <Select
            value={form.countySlug || undefined}
            onValueChange={(v) => {
              update("countySlug", v);
              update("subcounty", "");
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {KENYA_COUNTIES.map((county) => (
                <SelectItem key={county.slug} value={county.slug}>
                  {county.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sub-county">
          <Select
            value={form.subcounty || undefined}
            onValueChange={(v) => update("subcounty", v)}
            disabled={!form.countySlug}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={
                  form.countySlug ? "Select sub-county" : "Select county first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {subCounties.map((sc) => (
                <SelectItem key={sc} value={sc}>
                  {sc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Ward">
          <Input
            value={form.ward}
            onChange={(e) => update("ward", e.target.value)}
            placeholder="Optional ward name"
            className="h-9"
          />
        </Field>
        <Field label="Area / estate">
          <Input
            value={form.areaEstate}
            onChange={(e) => update("areaEstate", e.target.value)}
            placeholder="e.g. Kilimani, Karen"
            className="h-9"
          />
        </Field>
        <Field label="Landmark" className="sm:col-span-2">
          <Input
            value={form.landmark}
            onChange={(e) => update("landmark", e.target.value)}
            placeholder="Near mall, junction, etc."
            className="h-9"
          />
        </Field>
      </div>

      <Field label="Map pin" hint="Optional — search, click map, or use GPS to set coordinates">
        <MapPinPicker
          latitude={form.latitude}
          longitude={form.longitude}
          countySlug={form.countySlug}
          onChange={(lat, lng) => {
            update("latitude", lat);
            update("longitude", lng);
          }}
          onAddressSuggest={(address) => {
            if (!form.siteAddress.trim()) {
              update("siteAddress", address);
              update("location", address);
            }
          }}
          onKenyaAdminSuggest={(admin) => {
            if (!form.countySlug && admin.countySlug) {
              update("countySlug", admin.countySlug);
            }
            if (!form.subcounty.trim() && admin.subcounty) {
              update("subcounty", admin.subcounty);
            }
            if (!form.ward.trim() && admin.ward) {
              update("ward", admin.ward);
            }
          }}
          mapHeightClassName="h-56 sm:h-64"
        />
      </Field>

      <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
        <Checkbox
          id="need-site-visit"
          checked={form.needSiteVisit}
          onCheckedChange={(checked) =>
            update("needSiteVisit", checked === true)
          }
        />
        <div className="grid gap-1">
          <Label htmlFor="need-site-visit" className="text-sm font-medium">
            Site visit required
          </Label>
          <p className="text-xs text-muted-foreground">
            Flag early if measurements or inspection will be needed.
          </p>
        </div>
      </div>

      {form.needSiteVisit ? (
        <Field label="Assigned field officer">
          <Select
            value={
              form.assignedFieldOfficerId
                ? String(form.assignedFieldOfficerId)
                : undefined
            }
            onValueChange={(v) =>
              update("assignedFieldOfficerId", v ? Number(v) : null)
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select field officer" />
            </SelectTrigger>
            <SelectContent>
              {fieldOfficers.map((officer) => (
                <SelectItem key={officer.id} value={String(officer.id)}>
                  {officer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </div>
  );

  const requirementsSection = (
    <div className="grid gap-4">
      <Field label="Product interests">
        <ProductInterestPicker
          options={productInterests.map((p) => ({
            slug: p.slug,
            label: p.label,
          }))}
          selected={form.productInterests}
          onChange={(next) => update("productInterests", next)}
        />
      </Field>
      <Field label="Property / site type">
        <Select
          value={form.propertySiteType || undefined}
          onValueChange={(v) => update("propertySiteType", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {propertySiteTypeOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Requirement description">
        <Textarea
          value={form.requirementDescription}
          onChange={(e) => update("requirementDescription", e.target.value)}
          placeholder="Blinds for 12 office windows, installation in Q3…"
          rows={3}
          className="resize-none"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated value (KES)">
          <Input
            type="number"
            min={0}
            step={1000}
            value={form.estimatedValue || ""}
            onChange={(e) =>
              update("estimatedValue", Number(e.target.value) || 0)
            }
            className="h-9"
          />
        </Field>
        <Field label="Estimated budget (KES)">
          <Input
            type="number"
            min={0}
            step={1000}
            value={form.estimatedBudget || ""}
            onChange={(e) =>
              update("estimatedBudget", Number(e.target.value) || 0)
            }
            className="h-9"
          />
        </Field>
        <Field label="Urgency">
          <Select
            value={form.urgency || undefined}
            onValueChange={(v) => update("urgency", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent>
              {urgencyOptions.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Expected timeline">
          <Input
            value={form.expectedTimeline}
            onChange={(e) => update("expectedTimeline", e.target.value)}
            placeholder="e.g. 2–3 months"
            className="h-9"
          />
        </Field>
      </div>
      <Field label="Internal notes">
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Follow-up context, site access notes…"
          rows={variant === "modal" ? 3 : 4}
          className="resize-none"
        />
      </Field>
    </div>
  );

  if (variant === "modal") {
    return (
      <Accordion
        type="multiple"
        defaultValue={["lead-info", "site-location"]}
        className="rounded-lg border border-border px-4"
      >
        <AccordionItem value="lead-info">
          <AccordionTrigger>Lead info</AccordionTrigger>
          <AccordionContent>{leadInfo}</AccordionContent>
        </AccordionItem>
        <AccordionItem value="contact">
          <AccordionTrigger>
            Contact{" "}
            <span className="ml-1 font-normal text-muted-foreground">
              (optional)
            </span>
          </AccordionTrigger>
          <AccordionContent>{contactSection}</AccordionContent>
        </AccordionItem>
        <AccordionItem value="site-location">
          <AccordionTrigger>Site &amp; location</AccordionTrigger>
          <AccordionContent>{locationSection}</AccordionContent>
        </AccordionItem>
        <AccordionItem value="requirements">
          <AccordionTrigger>Requirements</AccordionTrigger>
          <AccordionContent>{requirementsSection}</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <>
      <FormSection
        title="Lead info"
        description="Site or opportunity identity — contact is not required yet"
      >
        {leadInfo}
      </FormSection>

      <FormSection
        title="Contact"
        description="Optional — add when you have a person to reach"
      >
        {contactSection}
      </FormSection>

      <FormSection
        title="Site & location"
        description="Kenya county hierarchy and optional map pin"
      >
        {locationSection}
      </FormSection>

      <FormSection
        title="Requirements"
        description="Products, budget, and follow-up notes"
      >
        {requirementsSection}
      </FormSection>
    </>
  );
}
