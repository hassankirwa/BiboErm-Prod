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
    const phone = row.phone;
    if (!name?.trim() || !phone?.trim()) {
      continue;
    }

    const estimatedRaw =
      row["estimated value (kes)"] || row["estimated value"] || "";
    const estimated = estimatedRaw
      ? Number(estimatedRaw.replace(/[^\d.]/g, ""))
      : undefined;

    rows.push({
      name: name.trim(),
      contact_person_name: name.trim(),
      phone: phone.trim(),
      email: row.email?.trim() || null,
      account_name: row.company?.trim() || null,
      site_address: row.location?.trim() || null,
      source: row["lead source"]?.trim() || row.source?.trim() || null,
      estimated_value:
        estimated != null && !Number.isNaN(estimated) ? estimated : null,
    });
  }

  return rows;
}
