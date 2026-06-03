import type { PurchaseRequisition, PurchaseRequisitionLine } from "@/lib/api/procurement";

const BIBO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
  <rect x="3" y="6" width="22" height="48" rx="1.5" fill="#E63946"/>
  <rect x="6" y="9" width="16" height="42" rx="0.5" fill="#FFFFFF"/>
  <path d="M22 9 L42 14 L42 51 L22 51 Z" fill="#E63946"/>
  <path d="M24 12 L40 16 L40 49 L24 49 Z" fill="#BFE3F4"/>
  <line x1="32" y1="14" x2="32" y2="50" stroke="#FFFFFF" stroke-width="1.2"/>
  <line x1="24" y1="32" x2="40" y2="32" stroke="#FFFFFF" stroke-width="1.2"/>
  <circle cx="25" cy="32" r="1.5" fill="#1F2937"/>
</svg>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQty(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(3);
}

function lineOverage(line: PurchaseRequisitionLine): string | null {
  if (line.overage_quantity != null && line.overage_quantity !== "") {
    return formatQty(line.overage_quantity);
  }
  const required = line.required_quantity;
  if (required == null || required === "") return null;
  const order = Number.parseFloat(line.quantity);
  const req = Number.parseFloat(required);
  if (Number.isNaN(order) || Number.isNaN(req) || order <= req) return null;
  return (order - req).toFixed(3);
}

function lineSku(line: PurchaseRequisitionLine): string {
  return line.sku ?? line.warehouse_item?.sku ?? "—";
}

function lineUom(line: PurchaseRequisitionLine): string {
  return line.unit_of_measure ?? line.warehouse_item?.unit_of_measure ?? "—";
}

function projectLabel(requisition: PurchaseRequisition): string {
  if (!requisition.project) return "General procurement";
  const { reference, name } = requisition.project;
  return reference ? `${reference} · ${name}` : name;
}

function requisitionFilename(requisition: PurchaseRequisition): string {
  const slug = requisition.reference
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${slug || `requisition-${requisition.id}`}.pdf`;
}

/** Printable HTML document aligned with backend requisition-pdf.blade.php styling. */
export function buildRequisitionPdfHtml(requisition: PurchaseRequisition): string {
  const lines = requisition.lines ?? [];
  const lineRows = lines
    .map((line, index) => {
      const overage = lineOverage(line);
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(line.description)}</td>
        <td>${escapeHtml(lineSku(line))}</td>
        <td>${escapeHtml(formatLabel(line.trigger_type))}</td>
        <td class="numeric">${formatQty(line.required_quantity ?? line.quantity)}</td>
        <td class="numeric">${formatQty(line.quantity)}</td>
        <td class="numeric">${overage ?? "—"}</td>
        <td>${escapeHtml(lineUom(line))}</td>
      </tr>`;
    })
    .join("");

  const notesBlock = requisition.notes
    ? `<div class="notes">
        <strong>Notes</strong><br>
        <span class="muted">${escapeHtml(requisition.notes)}</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Purchase Requisition ${escapeHtml(requisition.reference)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
    .brand { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .brand-right { text-align: right; }
    .logo { margin-bottom: 8px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #0f172a; }
    .muted { color: #6b7280; }
    .meta { width: 100%; margin-top: 14px; border-collapse: collapse; }
    .meta td { padding: 4px 12px 4px 0; vertical-align: top; width: 33%; }
    table.lines { width: 100%; border-collapse: collapse; margin-top: 18px; }
    .lines th, .lines td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    .lines th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; color: #374151; }
    .numeric { text-align: right; }
    .notes { margin-top: 18px; padding: 12px; background: #f8fafc; border: 1px solid #e5e7eb; }
    .signatures { width: 100%; margin-top: 28px; border-collapse: collapse; }
    .signatures td { width: 50%; padding-right: 18px; vertical-align: top; }
    .sign-label { font-weight: bold; margin-bottom: 34px; }
    .sign-line { border-top: 1px solid #9ca3af; padding-top: 6px; color: #6b7280; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #ecfeff; color: #155e75; font-size: 11px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-left">
        <div class="logo">${BIBO_LOGO_SVG}</div>
        <h1>Purchase Requisition</h1>
        <div class="muted">Bibo ERP procurement document</div>
      </div>
      <div class="brand-right">
        <div><strong>${escapeHtml(requisition.reference)}</strong></div>
        <div class="muted">Created ${formatDateTime(requisition.created_at)}</div>
        <div style="margin-top: 8px;">
          <span class="pill">${escapeHtml(formatLabel(requisition.status))}</span>
        </div>
      </div>
    </div>
    <table class="meta">
      <tr>
        <td><strong>Project</strong><br>${escapeHtml(projectLabel(requisition))}</td>
        <td><strong>Requester</strong><br>${escapeHtml(requisition.requester?.name ?? "System")}</td>
        <td><strong>Submitted</strong><br>${requisition.submitted_at ? formatDateTime(requisition.submitted_at) : "Pending submission"}</td>
      </tr>
      <tr>
        <td><strong>Supplier</strong><br>${escapeHtml(requisition.supplier?.name ?? "—")}</td>
        <td><strong>Admin approver</strong><br>${escapeHtml(requisition.approver?.name ?? "Pending approval")}</td>
        <td><strong>Approved</strong><br>${requisition.approved_at ? formatDateTime(requisition.approved_at) : "Pending approval"}</td>
      </tr>
    </table>
  </div>
  <table class="lines">
    <thead>
      <tr>
        <th style="width: 32px;">#</th>
        <th>Material</th>
        <th>SKU / Code</th>
        <th>Source</th>
        <th class="numeric">Required</th>
        <th class="numeric">Order Qty</th>
        <th class="numeric">Overage</th>
        <th>UOM</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || '<tr><td colspan="8" class="muted">No line items</td></tr>'}
    </tbody>
  </table>
  ${notesBlock}
  <table class="signatures">
    <tr>
      <td>
        <div class="sign-label">Prepared by</div>
        <div class="sign-line">${escapeHtml(requisition.requester?.name ?? "Requester signature")}</div>
      </td>
      <td>
        <div class="sign-label">Admin approval sign-off</div>
        <div class="sign-line">Name, signature &amp; date</div>
      </td>
    </tr>
  </table>
  <p class="no-print muted" style="margin-top: 24px;">
    Use your browser print dialog and choose &ldquo;Save as PDF&rdquo; to download this document.
  </p>
</body>
</html>`;
}

/** Opens a print-ready document; user saves via Print → Save as PDF. */
export function printRequisitionDocument(
  requisition: PurchaseRequisition,
  filename?: string,
): void {
  const html = buildRequisitionPdfHtml(requisition);
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to download the requisition PDF.");
  }

  const title = filename ?? requisitionFilename(requisition);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === "complete") {
    triggerPrint();
  } else {
    printWindow.addEventListener("load", triggerPrint, { once: true });
  }
}
