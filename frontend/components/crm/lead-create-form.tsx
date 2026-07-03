"use client";

import { useEffect, useState } from "react";
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
import { CrmPillToggle } from "@/components/crm/crm-pill-toggle";
import { AccountPicker } from "@/components/crm/account-picker";
import type { ApiAccount } from "@/lib/api/crm/accounts";
import {
  emptyLeadForm,
  type LeadFormValues,
} from "@/lib/lead-form-config";
import { LeadFormFields } from "@/components/crm/lead-form-ui";
import { createLead, uploadLeadPhoto } from "@/lib/api/crm/leads";
import { fetchFieldDayPin } from "@/lib/api/crm/field-day";
import { leadFormToCreatePayload } from "@/lib/crm-lead-payload";
import {
  isAdminOnlyLocationLabel,
  resolveKenyaAdminFromCoordinates,
  resolveSubcountyForCounty,
} from "@/lib/kenya-locations";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";
import { useAuth } from "@/contexts/auth-context";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

export function LeadCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lookups } = useCrmFormLookups({
    assignableRole: "sales_representative",
  });
  const returnView = searchParams.get("return");
  const fromPinId = searchParams.get("from_pin");
  const fieldDayPinId = fromPinId ? Number(fromPinId) : null;
  const leadsHref =
    returnView && ["list", "kanban", "calendar", "map"].includes(returnView)
      ? `/crm/leads?view=${returnView}`
      : "/crm/leads?view=list";

  const [form, setForm] = useState<LeadFormValues>(() =>
    emptyLeadForm("new_lead", {
      ownerId: user?.id ?? null,
      leadSourceId: lookups?.lead_sources[0]?.id ?? null,
    }),
  );
  const [submitting, setSubmitting] = useState(false);
  const [pinPrefillLoaded, setPinPrefillLoaded] = useState(!fieldDayPinId);
  const [intakeMode, setIntakeMode] = useState<"new" | "existing">("new");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [selectedAccountLabel, setSelectedAccountLabel] = useState<
    string | null
  >(null);

  const applyExistingAccountPrefill = (account: ApiAccount) => {
    const contact = account.primary_contact;
    const countySlug =
      lookups?.counties.find((county) => county.id === account.county_id)
        ?.slug ?? "";

    setForm((current) => ({
      ...current,
      company: account.name,
      contactPersonName:
        contact?.name ?? current.contactPersonName ?? account.name,
      phone: contact?.phone ?? account.phone ?? current.phone,
      email: contact?.email ?? account.email ?? current.email,
      whatsapp: contact?.whatsapp ?? current.whatsapp,
      jobTitle: contact?.job_title ?? current.jobTitle,
      ownerId:
        account.account_owner_id ?? account.owner_id ?? current.ownerId ?? user?.id ?? null,
      countySlug: countySlug || current.countySlug,
      location:
        account.physical_address ??
        account.billing_address ??
        current.location,
      siteAddress:
        account.physical_address ??
        account.billing_address ??
        current.siteAddress,
    }));
    setSelectedAccountId(account.id);
    setSelectedAccountLabel(account.name);
  };

  const clearExistingAccount = () => {
    setSelectedAccountId(null);
    setSelectedAccountLabel(null);
  };

  useEffect(() => {
    if (!lookups) return;
    setForm((current) => ({
      ...current,
      ownerId: current.ownerId ?? user?.id ?? null,
      leadSourceId:
        current.leadSourceId ??
        lookups.lead_sources.find((source) => source.slug === "field_visit")
          ?.id ??
        lookups.lead_sources[0]?.id ??
        null,
      leadTypeId:
        current.leadTypeId ?? lookups.lead_types[0]?.id ?? null,
    }));
  }, [lookups, user?.id]);

  useEffect(() => {
    if (!fieldDayPinId || Number.isNaN(fieldDayPinId) || !lookups) return;

    fetchFieldDayPin(fieldDayPinId)
      .then(async (pin) => {
        const countySlug =
          lookups.counties.find((county) => county.id === pin.county_id)
            ?.slug ?? "";

        let subcounty =
          (countySlug
            ? resolveSubcountyForCounty(countySlug, pin.subcounty)
            : pin.subcounty) ||
          pin.subcounty ||
          "";

        let ward = pin.ward || "";

        if (
          countySlug &&
          !subcounty &&
          pin.latitude != null &&
          pin.longitude != null
        ) {
          const admin = await resolveKenyaAdminFromCoordinates(
            pin.latitude,
            pin.longitude,
          );
          if (admin?.subcounty) {
            subcounty =
              resolveSubcountyForCounty(countySlug, admin.subcounty) ??
              admin.subcounty;
          }
          if (!ward && admin?.ward) {
            ward = admin.ward;
          }
        }

        if (
          countySlug &&
          subcounty &&
          ward &&
          resolveSubcountyForCounty(countySlug, ward) === subcounty
        ) {
          ward = "";
        }

        const pinAdmin = {
          countyLabel: pin.county?.label ?? null,
          subcounty: subcounty || null,
          ward: ward || null,
        };
        const streetFromPin =
          pin.location_address &&
          !isAdminOnlyLocationLabel(pin.location_address, pinAdmin)
            ? pin.location_address
            : "";

        setForm((current) => ({
          ...current,
          title:
            pin.site_label ||
            pin.notes?.slice(0, 80) ||
            current.title ||
            "Field visit lead",
          siteName: pin.site_label || current.siteName,
          siteAddress:
            streetFromPin ||
            current.siteAddress,
          requirementDescription: pin.findings || current.requirementDescription,
          latitude: pin.latitude ?? current.latitude,
          longitude: pin.longitude ?? current.longitude,
          countySlug: countySlug || current.countySlug,
          subcounty: subcounty || current.subcounty,
          ward: ward || current.ward,
          leadSourceId:
            lookups.lead_sources.find((source) => source.slug === "field_visit")
              ?.id ??
            current.leadSourceId,
        }));
        setPinPrefillLoaded(true);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Could not load field day pin.",
        );
        setPinPrefillLoaded(true);
      });
  }, [fieldDayPinId, lookups]);

  const stage = leadKanbanStages.find((s) => s.id === form.stageId);

  const update = <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (intakeMode === "existing" && !selectedAccountId) {
      toast.error("Select an existing client account.");
      return;
    }
    setSubmitting(true);
    try {
      await ensureCsrfCookie();
      const lead = await createLead(
        leadFormToCreatePayload(form, {
          counties: lookups?.counties,
          product_interests: lookups?.product_interests,
          fieldDayPinId,
          existingAccountId:
            intakeMode === "existing" ? selectedAccountId : null,
        }),
      );

      let photoUploadError: string | null = null;
      if (form.sitePhotoFiles.length > 0) {
        try {
          for (let i = 0; i < form.sitePhotoFiles.length; i += 1) {
            await uploadLeadPhoto(lead.id, form.sitePhotoFiles[i], {
              sort_order: i,
            });
          }
        } catch (photoErr) {
          photoUploadError =
            photoErr instanceof ApiError
              ? photoErr.message
              : "Site photos could not be uploaded.";
        }
      }

      if (photoUploadError) {
        toast.error(photoUploadError);
      }

      const contactConfirmed =
        Boolean(lead.contact_person_name?.trim()) ||
        Boolean(lead.phone?.trim()) ||
        Boolean(lead.email?.trim());

      toast.success(
        intakeMode === "existing"
          ? "Lead linked to existing client account."
          : contactConfirmed
            ? "Lead created — contact confirmed. Create an account before scheduling a site visit."
            : "Lead created. Add contact details when the client is identified.",
      );

      router.push(`/crm/leads/${lead.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create lead.",
      );
      setSubmitting(false);
    }
  };

  if (!pinPrefillLoaded) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href={fieldDayPinId ? "/crm/field-day" : leadsHref}>
            <ArrowLeft className="h-4 w-4" />
            {fieldDayPinId ? "Field day" : "Leads"}
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
              {fieldDayPinId ? (
                <Badge variant="secondary">From field day pin</Badge>
              ) : null}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1e3a5f] sm:text-2xl">
              New lead
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              {fieldDayPinId
                ? "Review the prefilled site details from your field visit, then create the lead."
                : intakeMode === "existing"
                  ? "Link a new project opportunity to an existing client account. Contact details are prefilled from the account."
                  : "Capture the site or opportunity first. Contact details are optional until someone is identified."}
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
                Commercial value is captured later, after measurements and
                quotation preparation.
              </p>
            </CardContent>
          </Card>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!fieldDayPinId ? (
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="border-b px-5 py-4">
                <CardTitle className="text-sm text-[#1e3a5f]">
                  Client type
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose whether this is a brand-new client or an existing
                  account returning for another project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 py-4">
                <CrmPillToggle
                  value={intakeMode}
                  onChange={(value) => {
                    setIntakeMode(value);
                    if (value === "new") {
                      clearExistingAccount();
                    }
                  }}
                  options={[
                    { id: "new", label: "New client" },
                    { id: "existing", label: "Existing client" },
                  ]}
                />
                {intakeMode === "existing" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Existing account *
                    </p>
                    <AccountPicker
                      value={selectedAccountId}
                      displayLabel={selectedAccountLabel}
                      onSelect={applyExistingAccountPrefill}
                      onClear={clearExistingAccount}
                      required
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <LeadFormFields
            form={form}
            update={update}
            showSiteVisitFields={false}
          />

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-5 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <p className="text-sm text-muted-foreground">
              Fields marked * are required
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href={fieldDayPinId ? "/crm/field-day" : leadsHref}>
                  Cancel
                </Link>
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
