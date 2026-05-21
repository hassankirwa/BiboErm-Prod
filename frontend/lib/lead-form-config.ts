import {
  leadKanbanAssignees,
  type LeadKanbanCard,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";

export const leadSourceOptions = [
  "Website",
  "Referral",
  "LinkedIn",
  "Facebook",
  "Cold Call",
  "Walk-in",
  "Existing Client",
  "Phone",
] as const;

export const tagOptions = [
  "New Inquiry",
  "High Priority",
  "Follow Up",
  "Qualified",
  "Site Visit",
] as const;

export type LeadFormValues = {
  title: string;
  company: string;
  location: string;
  phone: string;
  email: string;
  source: string;
  stageId: LeadKanbanStageId;
  owner: string;
  estimatedValue: number;
  nextActionDate: string;
  tag: string;
  notes: string;
};

export function emptyLeadForm(
  stageId: LeadKanbanStageId = "new"
): LeadFormValues {
  return {
    title: "",
    company: "",
    location: "",
    phone: "",
    email: "",
    source: leadSourceOptions[0],
    stageId,
    owner: leadKanbanAssignees[0],
    estimatedValue: 0,
    nextActionDate: new Date().toISOString().slice(0, 10),
    tag: tagOptions[0],
    notes: "",
  };
}

export function leadFormValuesToKanbanCard(values: LeadFormValues): LeadKanbanCard {
  return {
    id: `kb_${Date.now()}`,
    stageId: values.stageId,
    title: values.title.trim(),
    location: values.location.trim(),
    owner: values.owner,
    nextActionDate: values.nextActionDate,
    estimatedValue: values.estimatedValue,
    tag: values.tag,
    company: values.company.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
    source: values.source,
    notes: values.notes.trim() || undefined,
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
  "Estimated Value (KES)",
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
  "950000",
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
