import type { ImportHistoricalLeadRow } from "@/lib/api/crm/leads";

export const HISTORICAL_QUOTE_HEADERS = [
  "Quote No.",
  "Quote Date",
  "Project Name",
  "Customer Name",
  "Phone",
  "Lead Source",
  "Door & Window Series",
  "Total Sets",
  "Total SQM",
  "Total Quotation Amount",
  "Progress",
  "Customer Feedback",
  "Sales Rep",
  "Remarks",
] as const;

const OPEN_PROGRESS = new Set([
  "draft",
  "sent",
  "awaiting feedback",
  "negotiating",
  "revised",
  "on hold",
]);

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeProgress(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date? leave as number string for amount; dates handled separately
    return String(value);
  }
  return String(value).trim();
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  if (!cleaned || Number.isNaN(Number(cleaned))) return null;
  return Math.round(Number(cleaned) * 100) / 100;
}

function excelSerialToDate(serial: number): string | null {
  // Excel epoch (Windows) — days since 1899-12-30
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) {
    return null;
  }
  const utc = Date.UTC(1899, 11, 30) + serial * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

function parseQuoteDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return excelSerialToDate(value);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return null;
}

function headerIndexMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((header, index) => {
    map[normalizeHeader(header)] = index;
  });
  return map;
}

function getCell(
  row: unknown[],
  map: Record<string, number>,
  ...aliases: string[]
): unknown {
  for (const alias of aliases) {
    const idx = map[normalizeHeader(alias)];
    if (idx != null && idx < row.length) {
      return row[idx];
    }
  }
  return null;
}

export type HistoricalImportPreviewRow = ImportHistoricalLeadRow & {
  _skipReason?: string;
};

export function mapQuotationRegisterRows(
  matrix: unknown[][],
): {
  importable: ImportHistoricalLeadRow[];
  preview: HistoricalImportPreviewRow[];
  skippedLost: number;
  skippedEmpty: number;
} {
  if (matrix.length < 2) {
    return { importable: [], preview: [], skippedLost: 0, skippedEmpty: 0 };
  }

  const headerRow = (matrix[0] ?? []).map((h) => cellString(h));
  const map = headerIndexMap(headerRow);

  const importable: ImportHistoricalLeadRow[] = [];
  const preview: HistoricalImportPreviewRow[] = [];
  let skippedLost = 0;
  let skippedEmpty = 0;

  for (const raw of matrix.slice(1)) {
    if (!Array.isArray(raw) || raw.every((c) => c == null || cellString(c) === "")) {
      skippedEmpty += 1;
      continue;
    }

    const customerName = cellString(
      getCell(raw, map, "Customer Name", "customer_name", "name"),
    );
    const phone = cellString(getCell(raw, map, "Phone", "phone"));
    const progressRaw = getCell(raw, map, "Progress", "progress");
    const progress = normalizeProgress(progressRaw);
    const quoteNo = cellString(
      getCell(raw, map, "Quote No.", "Quote No", "external_quote_no", "quote_no"),
    );
    const projectName = cellString(
      getCell(raw, map, "Project Name", "project_name"),
    );
    const amount = parseAmount(
      getCell(raw, map, "Total Quotation Amount", "estimated_value"),
    );
    const quoteDate = parseQuoteDate(getCell(raw, map, "Quote Date", "quote_date"));

    if (!customerName && !quoteNo && !phone) {
      skippedEmpty += 1;
      continue;
    }

    if (progress === "lost") {
      skippedLost += 1;
      preview.push({
        name: customerName || "—",
        phone,
        progress: "Lost",
        external_quote_no: quoteNo || null,
        _skipReason: "Lost (skipped)",
      });
      continue;
    }

    const isWon = progress === "won";
    const isOpen = OPEN_PROGRESS.has(progress);
    if (!isWon && !isOpen) {
      preview.push({
        name: customerName || "—",
        phone,
        progress: cellString(progressRaw) || progress,
        external_quote_no: quoteNo || null,
        _skipReason: "Unsupported progress",
      });
      continue;
    }

    if (!customerName) {
      preview.push({
        name: "—",
        phone,
        progress: cellString(progressRaw),
        external_quote_no: quoteNo || null,
        _skipReason: "Missing customer name",
      });
      continue;
    }

    const row: ImportHistoricalLeadRow = {
      name: customerName,
      phone: phone || undefined,
      progress: cellString(progressRaw) || progress,
      project_name: projectName || null,
      source: cellString(getCell(raw, map, "Lead Source", "source")) || null,
      estimated_value: amount,
      quote_date: quoteDate,
      external_quote_no: quoteNo || null,
      series:
        cellString(getCell(raw, map, "Door & Window Series", "series")) || null,
      total_sets: cellString(getCell(raw, map, "Total Sets")) || null,
      total_sqm: cellString(getCell(raw, map, "Total SQM")) || null,
      sales_rep: cellString(getCell(raw, map, "Sales Rep")) || null,
      customer_feedback:
        cellString(getCell(raw, map, "Customer Feedback")) || null,
      remarks: cellString(getCell(raw, map, "Remarks")) || null,
    };

    importable.push(row);
    preview.push(row);
  }

  return { importable, preview, skippedLost, skippedEmpty };
}

function parseCsvMatrix(text: string): unknown[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, index) => index === 0 || line.trim() !== "");

  return lines.map((line) => {
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
  });
}

export async function parseHistoricalQuotationsFile(
  file: File,
): Promise<ReturnType<typeof mapQuotationRegisterRows>> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = await file.text();
    return mapQuotationRegisterRows(parseCsvMatrix(text));
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((name) =>
      normalizeHeader(name).includes("quotation register"),
    ) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { importable: [], preview: [], skippedLost: 0, skippedEmpty: 0 };
  }
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  return mapQuotationRegisterRows(matrix);
}
