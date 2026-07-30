import type { GlassOrder, GlassOrderPane } from "@/lib/api/procurement";

export const BIBO_LOGO_PATH = "/bibo-logo.png";

type PdfHtmlOptions = {
  logoUrl?: string;
};

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

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const num = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (Number.isNaN(num)) return String(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatDims(pane: GlassOrderPane): string {
  const w = pane.width_mm;
  const h = pane.height_mm;
  if (w == null || h == null || w === "" || h === "") return "—";
  return `${formatQty(w)} × ${formatQty(h)} mm`;
}

function projectLabel(order: GlassOrder): string {
  if (!order.project) return `Project #${order.project_id}`;
  const { reference, name } = order.project;
  return reference ? `${reference} · ${name}` : name;
}

function supplierBlock(order: GlassOrder): string {
  const supplier = order.supplier;
  if (!supplier) return "—";
  const lines = [
    supplier.name,
    supplier.code ? `Code: ${supplier.code}` : null,
    supplier.phone ? `Phone: ${supplier.phone}` : null,
    supplier.email ? `Email: ${supplier.email}` : null,
    supplier.address ? `Address: ${supplier.address}` : null,
  ].filter(Boolean);
  return lines.map((line) => escapeHtml(String(line))).join("<br>");
}

function glassOrderFilename(order: GlassOrder): string {
  const slug = order.order_number
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${slug || `glass-order-${order.id}`}-po.pdf`;
}

function logoMarkup(logoUrl: string): string {
  return `<img src="${escapeHtml(logoUrl)}" alt="Bibo Windows &amp; Doors" class="logo" />`;
}

function resolveLogoUrl(logoUrl?: string): string {
  if (logoUrl) return logoUrl;
  if (typeof window !== "undefined") {
    return new URL(BIBO_LOGO_PATH, window.location.origin).href;
  }
  return BIBO_LOGO_PATH;
}

/** Supplier-facing glass purchase order document (Bibo logo + pane schedule). */
export function buildGlassOrderPdfHtml(order: GlassOrder, options?: PdfHtmlOptions): string {
  const logoUrl = resolveLogoUrl(options?.logoUrl);
  const panes = order.specs?.panes ?? [];
  const lineRows = panes
    .map((pane, index) => {
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(pane.name || `Pane ${index + 1}`)}</td>
        <td>${escapeHtml(pane.glass_type || "—")}</td>
        <td>${escapeHtml(pane.tint || "—")}</td>
        <td>${escapeHtml(formatDims(pane))}</td>
        <td class="numeric">${formatQty(pane.quantity)}</td>
        <td>${escapeHtml(pane.notes || "—")}</td>
      </tr>`;
    })
    .join("");

  const requirements = order.specs?.requirements
    ? `<div class="notes">
        <strong>Glass requirements</strong><br>
        <span class="muted">${escapeHtml(order.specs.requirements)}</span>
      </div>`
    : "";

  const notesBlock = order.notes
    ? `<div class="notes">
        <strong>Notes</strong><br>
        <span class="muted">${escapeHtml(order.notes)}</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Glass Purchase Order ${escapeHtml(order.order_number)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
    .brand { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .brand-right { text-align: right; }
    .logo { display: block; max-height: 64px; width: auto; margin-bottom: 10px; }
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
    .supplier-box { margin-top: 16px; padding: 12px; border: 1px solid #0f766e; background: #f0fdfa; }
    .supplier-box strong { color: #0f766e; }
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
        ${logoMarkup(logoUrl)}
        <h1>Glass Purchase Order</h1>
        <div class="muted">Bibo Windows &amp; Doors · Supplier order document</div>
      </div>
      <div class="brand-right">
        <div><strong>${escapeHtml(order.order_number)}</strong></div>
        <div class="muted">Created ${formatDateTime(order.created_at)}</div>
        <div style="margin-top: 8px;">
          <span class="pill">${escapeHtml(formatLabel(order.status))}</span>
        </div>
      </div>
    </div>
    <table class="meta">
      <tr>
        <td><strong>Project</strong><br>${escapeHtml(projectLabel(order))}</td>
        <td><strong>Ordered</strong><br>${order.ordered_at ? formatDateTime(order.ordered_at) : "Pending"}</td>
        <td><strong>Expected delivery</strong><br>${escapeHtml(formatDate(order.expected_delivery))}</td>
      </tr>
      <tr>
        <td><strong>Delivery location</strong><br>${escapeHtml(order.delivery_location || "—")}</td>
        <td><strong>Prepared by</strong><br>${escapeHtml(order.creator?.name ?? "Procurement")}</td>
        <td><strong>Currency</strong><br>${escapeHtml(order.currency ?? "KES")}</td>
      </tr>
    </table>
    <div class="supplier-box">
      <strong>Supplier (to)</strong><br>
      ${supplierBlock(order)}
    </div>
  </div>
  <table class="lines">
    <thead>
      <tr>
        <th style="width: 32px;">#</th>
        <th>Component</th>
        <th>Glass type</th>
        <th>Tint</th>
        <th>Size (W × H)</th>
        <th class="numeric">Qty</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || '<tr><td colspan="7" class="muted">No glass panes listed</td></tr>'}
    </tbody>
  </table>
  ${requirements}
  ${notesBlock}
  <table class="signatures">
    <tr>
      <td>
        <div class="sign-label">Procurement sign-off</div>
        <div class="sign-line">${escapeHtml(order.creator?.name ?? "Name, signature &amp; date")}</div>
      </td>
      <td>
        <div class="sign-label">Supplier acknowledgement</div>
        <div class="sign-line">Name, signature &amp; date</div>
      </td>
    </tr>
  </table>
  <p class="no-print muted" style="margin-top: 24px;">
    Use your browser print dialog and choose &ldquo;Save as PDF&rdquo; to download this document for the supplier.
  </p>
</body>
</html>`;
}

/** Opens a print-ready glass PO; user saves via Print → Save as PDF. */
export function printGlassOrderDocument(order: GlassOrder, filename?: string): void {
  const html = buildGlassOrderPdfHtml(order);
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to download the glass order PDF.");
  }

  const title = filename ?? glassOrderFilename(order);
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
