import type { LeadKanbanCard, LeadKanbanStageId } from "@/lib/leads-kanban-data";

export const tagOptions = [
  "New Inquiry",
  "High Priority",
  "Follow Up",
  "Qualified",
  "Site Visit",
] as const;

export const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const urgencyOptions = [
  { value: "flexible", label: "Flexible" },
  { value: "within_month", label: "Within a month" },
  { value: "within_week", label: "Within a week" },
  { value: "immediate", label: "Immediate" },
] as const;

export const propertySiteTypeOptions = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "institutional", label: "Institutional" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "other", label: "Other" },
] as const;

export const preferredContactMethodOptions = [
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
] as const;

export type LeadFormValues = {
  title: string;
  leadTypeId: number | null;
  leadSourceId: number | null;
  /** Lookup slug bound to the Lead source select (same pattern as countySlug). */
  leadSourceSlug: string;
  stageId: LeadKanbanStageId;
  ownerId: number | null;
  priority: string;
  tag: string;
  contactPersonName: string;
  phone: string;
  email: string;
  whatsapp: string;
  jobTitle: string;
  preferredContactMethod: string;
  preferredContactTime: string;
  company: string;
  siteName: string;
  siteAddress: string;
  location: string;
  countySlug: string;
  subcounty: string;
  ward: string;
  areaEstate: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  needSiteVisit: boolean;
  assignedFieldOfficerId: number | null;
  /** When set with needSiteVisit, schedules a site visit after lead create. */
  siteVisitDate: string;
  siteVisitTime: string;
  siteVisitNotesForOfficer: string;
  productInterests: string[];
  requirementDescription: string;
  propertySiteType: string;
  buildingConstructionStageId: number | null;
  sitePhotoFiles: File[];
  urgency: string;
  expectedTimeline: string;
  nextActionDate: string;
  nextAction: string;
  notes: string;
};

export function emptyLeadForm(
  stageId: LeadKanbanStageId = "new_lead",
  defaults?: {
    ownerId?: number | null;
    leadSourceId?: number | null;
    leadSourceSlug?: string;
    leadTypeId?: number | null;
  },
): LeadFormValues {
  return {
    title: "",
    leadTypeId: defaults?.leadTypeId ?? null,
    leadSourceId: defaults?.leadSourceId ?? null,
    leadSourceSlug: defaults?.leadSourceSlug ?? "",
    stageId,
    ownerId: defaults?.ownerId ?? null,
    priority: "medium",
    tag: tagOptions[0],
    contactPersonName: "",
    phone: "",
    email: "",
    whatsapp: "",
    jobTitle: "",
    preferredContactMethod: "",
    preferredContactTime: "",
    company: "",
    siteName: "",
    siteAddress: "",
    location: "",
    countySlug: "",
    subcounty: "",
    ward: "",
    areaEstate: "",
    landmark: "",
    latitude: null,
    longitude: null,
    needSiteVisit: false,
    assignedFieldOfficerId: null,
    siteVisitDate: "",
    siteVisitTime: "",
    siteVisitNotesForOfficer: "",
    productInterests: [],
    requirementDescription: "",
    propertySiteType: "",
    buildingConstructionStageId: null,
    sitePhotoFiles: [],
    urgency: "",
    expectedTimeline: "",
    nextActionDate: new Date().toISOString().slice(0, 10),
    nextAction: "",
    notes: "",
  };
}

export function hasContactInfo(values: LeadFormValues): boolean {
  return (
    values.contactPersonName.trim() !== "" ||
    values.phone.trim() !== "" ||
    values.email.trim() !== ""
  );
}

export function leadFormValuesToKanbanCard(values: LeadFormValues): LeadKanbanCard {
  const location =
    values.siteAddress.trim() ||
    values.location.trim() ||
    [values.areaEstate, values.subcounty, values.countySlug]
      .filter(Boolean)
      .join(", ");

  return {
    id: `kb_${Date.now()}`,
    stageId: values.stageId,
    statusKey: values.stageId,
    title: values.title.trim(),
    location: location.trim(),
    owner: values.ownerId ? String(values.ownerId) : "Unassigned",
    ownerId: values.ownerId,
    leadSourceId: values.leadSourceId,
    nextActionDate: values.nextActionDate,
    tag: values.tag,
    company: values.company.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
    notes: values.notes.trim() || undefined,
    latitude: values.latitude,
    longitude: values.longitude,
  };
}

export const LEAD_IMPORT_TEMPLATE_HEADERS = [
  "Lead Name",
  "Company",
  "Location",
  "Phone",
  "Email",
  "Lead Source",
  "Stage",
  "Owner",
  "Next Action Date",
  "Tag",
  "Notes",
] as const;

export const LEAD_IMPORT_TEMPLATE_SAMPLE_ROW = [
  "Kilimani Apartment",
  "Kilimani Heights Developers",
  "Kilimani, Nairobi",
  "0712 345 678",
  "info@example.co.ke",
  "Website",
  "New Lead",
  "Brian Otieno",
  "2026-05-22",
  "High Priority",
  "Optional notes",
];

export function buildLeadImportTemplateCsv(): string {
  const escape = (cell: string) =>
    cell.includes(",") || cell.includes('"')
      ? `"${cell.replace(/"/g, '""')}"`
      : cell;
  return [
    LEAD_IMPORT_TEMPLATE_HEADERS.join(","),
    LEAD_IMPORT_TEMPLATE_SAMPLE_ROW.map(escape).join(","),
  ].join("\n");
}

export function downloadLeadImportTemplate() {
  const csv = buildLeadImportTemplateCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leads-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function parseLeadImportCsv(text: string): import("@/lib/api/crm/leads").ImportLeadRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows: import("@/lib/api/crm/leads").ImportLeadRow[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    const name = row["lead name"] || row.name;
    if (!name?.trim()) {
      continue;
    }

    const phone = row.phone?.trim();

    rows.push({
      name: name.trim(),
      contact_person_name: row["contact person"]?.trim() || name.trim(),
      phone: phone || undefined,
      email: row.email?.trim() || null,
      account_name: row.company?.trim() || null,
      site_address: row.location?.trim() || null,
      source: row["lead source"]?.trim() || row.source?.trim() || null,
    });
  }

  return rows;
}
