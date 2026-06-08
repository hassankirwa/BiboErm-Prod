"use client";

import { CrmDetailField } from "@/components/crm/crm-record-detail-shell";
import { useMediaImageSrc } from "@/components/media/media-image";
import { formatKesFull } from "@/lib/leads-kanban-data";
import {
  propertySiteTypeOptions,
  urgencyOptions,
  priorityOptions,
  preferredContactMethodOptions,
} from "@/lib/lead-form-config";
import { formatDisplayDate } from "@/lib/activity-due-date";
import type { ApiLeadDetail, CrmLookupItem } from "@/lib/api/crm/types";
import { cn } from "@/lib/utils";

function formatSlugLabel(
  value: string | null | undefined,
  options: ReadonlyArray<{ value: string; label: string }>,
): string | null {
  if (!value?.trim()) return null;
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, " ");
}

function resolveProductInterestLabels(
  slugs: string[] | null | undefined,
  lookups?: CrmLookupItem[],
): string | null {
  if (!slugs?.length) return null;
  const labels = slugs.map(
    (slug) => lookups?.find((item) => item.slug === slug)?.label ?? slug,
  );
  return labels.join(", ");
}

function DetailSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-sm font-semibold text-[#1e3a5f]">{title}</h4>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </dl>
    </section>
  );
}

type LeadPhoto = NonNullable<ApiLeadDetail["photos"]>[number];

function LeadSitePhoto({ photo }: { photo: LeadPhoto }) {
  const label = photo.caption?.trim() || "Site photo";
  const { displaySrc, loading, onError } = useMediaImageSrc(photo.url);

  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted/30">
      {displaySrc && !loading ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt={label}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={onError}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          {loading ? "Loading…" : "Image unavailable"}
        </div>
      )}
      {photo.caption ? (
        <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] text-white">
          {photo.caption}
        </span>
      ) : null}
    </div>
  );
}

function LeadSitePhotos({ photos }: { photos: ApiLeadDetail["photos"] }) {
  const items = (photos ?? []).filter((photo) => photo.url);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No site images uploaded.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((photo) => (
        <LeadSitePhoto key={photo.id} photo={photo} />
      ))}
    </div>
  );
}

export function LeadDetailIntake({
  lead,
  productInterestLookups,
}: {
  lead: ApiLeadDetail;
  productInterestLookups?: CrmLookupItem[];
}) {
  const ownerName =
    lead.lead_owner?.name ?? lead.assigned_sales_user?.name ?? null;
  const fieldOfficerName = lead.assigned_field_officer?.name ?? null;
  const locationParts = [
    lead.site_address,
    lead.area_estate,
    lead.subcounty,
    lead.ward,
  ].filter(Boolean);
  const location =
    locationParts.length > 0 ? locationParts.join(", ") : lead.site_address;
  const coords =
    lead.latitude != null && lead.longitude != null
      ? `${Number(lead.latitude).toFixed(5)}, ${Number(lead.longitude).toFixed(5)}`
      : null;

  return (
    <div className="space-y-8">
      <DetailSection title="Lead info">
        <CrmDetailField label="Lead name" value={lead.name} />
        <CrmDetailField label="Site name" value={lead.site_name} />
        <CrmDetailField label="Company / account" value={lead.account_name ?? lead.company} />
        <CrmDetailField label="Lead source" value={lead.lead_source?.label ?? lead.source} />
        <CrmDetailField
          label="Priority"
          value={formatSlugLabel(lead.priority, priorityOptions)}
        />
        <CrmDetailField label="Lead owner" value={ownerName} />
        <CrmDetailField
          label="Lead stage"
          value={
            lead.status
              ? lead.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : null
          }
        />
      </DetailSection>

      <DetailSection
        title="Contact"
        description="Optional person details captured at intake"
      >
        <CrmDetailField label="Contact person" value={lead.contact_person_name} />
        <CrmDetailField
          label="Phone"
          value={lead.phone}
          href={lead.phone ? `tel:${lead.phone.replace(/\s/g, "")}` : undefined}
        />
        <CrmDetailField
          label="WhatsApp"
          value={lead.whatsapp}
          href={lead.whatsapp ? `tel:${lead.whatsapp.replace(/\s/g, "")}` : undefined}
        />
        <CrmDetailField
          label="Email"
          value={lead.email}
          href={lead.email ? `mailto:${lead.email}` : undefined}
        />
        <CrmDetailField label="Job title" value={lead.job_title} />
        <CrmDetailField
          label="Preferred contact method"
          value={formatSlugLabel(
            lead.preferred_contact_method,
            preferredContactMethodOptions,
          )}
        />
        <CrmDetailField
          label="Preferred contact time"
          value={lead.preferred_contact_time}
        />
      </DetailSection>

      <DetailSection
        title="Site & location"
        description="Kenya location hierarchy and map pin from intake"
      >
        <CrmDetailField label="Site address" value={lead.site_address} className="sm:col-span-2" />
        <CrmDetailField label="Area / estate" value={lead.area_estate} />
        <CrmDetailField label="Sub-county" value={lead.subcounty} />
        <CrmDetailField label="Ward" value={lead.ward} />
        <CrmDetailField label="Landmark" value={lead.landmark} />
        <CrmDetailField label="Map coordinates" value={coords} />
        <CrmDetailField label="Location summary" value={location} className="sm:col-span-2" />
        <CrmDetailField
          label="Site visit required"
          value={lead.need_site_visit ? "Yes" : lead.need_site_visit === false ? "No" : null}
        />
        <CrmDetailField label="Assigned field officer" value={fieldOfficerName} />
      </DetailSection>

      <DetailSection
        title="Project info & requirements"
        description="Scope, construction stage, and commercial estimates"
      >
        <CrmDetailField
          label="Product interests"
          value={resolveProductInterestLabels(
            lead.product_interests,
            productInterestLookups,
          )}
          className="sm:col-span-2"
        />
        <CrmDetailField
          label="Property / site type"
          value={formatSlugLabel(lead.property_site_type, propertySiteTypeOptions)}
        />
        <CrmDetailField
          label="Building construction stage"
          value={lead.building_construction_stage?.label}
        />
        <CrmDetailField
          label="Requirement description"
          value={lead.requirement_description}
          className="sm:col-span-2 xl:col-span-3"
        />
        <CrmDetailField
          label="Estimated value"
          value={
            lead.estimated_value != null
              ? formatKesFull(Number(lead.estimated_value))
              : null
          }
        />
        <CrmDetailField
          label="Estimated budget"
          value={
            lead.estimated_budget != null
              ? formatKesFull(Number(lead.estimated_budget))
              : null
          }
        />
        <CrmDetailField
          label="Urgency"
          value={formatSlugLabel(lead.urgency, urgencyOptions)}
        />
        <CrmDetailField label="Expected timeline" value={lead.expected_timeline} />
        <CrmDetailField label="Next action" value={lead.next_action} />
        <CrmDetailField
          label="Next follow-up"
          value={
            lead.next_follow_up_at
              ? formatDisplayDate(lead.next_follow_up_at.slice(0, 10))
              : null
          }
        />
        <CrmDetailField
          label="Internal notes"
          value={lead.notes ?? lead.internal_notes}
          className="sm:col-span-2 xl:col-span-3"
        />
      </DetailSection>

      <section className="space-y-3 border-t border-border/80 pt-6">
        <div>
          <h4 className="text-sm font-semibold text-[#1e3a5f]">Site images</h4>
          <p className="text-xs text-muted-foreground">
            Photos captured on the new lead form or copied from a field day pin
          </p>
        </div>
        <LeadSitePhotos photos={lead.photos} />
      </section>
    </div>
  );
}
