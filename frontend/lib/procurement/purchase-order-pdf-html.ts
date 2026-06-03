import type { PurchaseOrder, PurchaseOrderLine } from "@/lib/api/procurement";

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
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(3);
}

function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function projectLabel(order: PurchaseOrder): string {
  if (!order.project) {
    return order.project_id ? `Project #${order.project_id}` : "Stock order";
  }
  const { reference, name } = order.project;
  return reference ? `${reference} · ${name}` : name;
}

export function purchaseOrderPdfFilename(order: PurchaseOrder): string {
  const slug = order.reference
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${slug || `purchase-order-${order.id}`}.pdf`;
}

function lineConfirmedQty(line: PurchaseOrderLine): string {
  return formatQty(line.received_qty ?? "0");
}

function logoMarkup(logoUrl: string): string {
  return `<img src="${escapeHtml(logoUrl)}" alt="Bibo" width="120" height="auto" class="logo" />`;
}

/** Printable supplier-facing PO document with supply checkboxes and warehouse confirmation column. */
export function buildPurchaseOrderPdfHtml(order: PurchaseOrder, options?: PdfHtmlOptions): string {
  const logoUrl = options?.logoUrl ?? BIBO_LOGO_PATH;
  const lines = order.lines ?? [];
  const transport = order.transport_orders?.[0];

  const lineRows = lines
    .map((line, index) => {
      return `<tr>
        <td class="checkbox-col"><span class="checkbox"></span></td>
        <td>${index + 1}</td>
        <td>${escapeHtml(line.description)}</td>
        <td>${escapeHtml(line.sku ?? "—")}</td>
        <td class="numeric">${formatQty(line.quantity)}</td>
        <td class="numeric">${lineConfirmedQty(line)}</td>
        <td class="numeric">${formatMoney(line.unit_price)}</td>
        <td class="numeric">${formatMoney(line.line_total)}</td>
      </tr>`;
    })
    .join("");

  const transportBlock = transport
    ? `<table class="meta">
        <tr>
          <td><strong>Transport</strong><br>${escapeHtml(transport.transport_type ?? "Delivery")}</td>
          <td><strong>Driver</strong><br>${escapeHtml(transport.driver_name ?? "—")}</td>
          <td><strong>Vehicle / Contact</strong><br>${escapeHtml([transport.vehicle, transport.driver_phone].filter(Boolean).join(" · ") || "—")}</td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Purchase Order ${escapeHtml(order.reference)}</title>
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
    .checkbox-col { width: 36px; text-align: center; }
    .checkbox { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #374151; border-radius: 2px; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; border-collapse: collapse; }
    .totals td { padding: 6px 0; }
    .totals .label { color: #6b7280; }
    .totals .amount { text-align: right; font-weight: 600; }
    .instructions { margin-top: 18px; padding: 12px; background: #f8fafc; border: 1px solid #e5e7eb; }
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
        <div class="logo-wrap">${logoMarkup(logoUrl)}</div>
        <h1>Purchase Order</h1>
        <div class="muted">Bibo ERP — supplier delivery document</div>
      </div>
      <div class="brand-right">
        <div><strong>${escapeHtml(order.reference)}</strong></div>
        <div class="muted">Issued ${formatDateTime(order.created_at)}</div>
        <div style="margin-top: 8px;">
          <span class="pill">${escapeHtml(formatLabel(order.status))}</span>
        </div>
      </div>
    </div>
    <table class="meta">
      <tr>
        <td><strong>Supplier</strong><br>${escapeHtml(order.supplier?.name ?? "—")}</td>
        <td><strong>Project</strong><br>${escapeHtml(projectLabel(order))}</td>
        <td><strong>Expected delivery</strong><br>${formatDate(order.expected_delivery)}</td>
      </tr>
      <tr>
        <td><strong>Supplier contact</strong><br>${escapeHtml([order.supplier?.phone, order.supplier?.email].filter(Boolean).join(" · ") || "—")}</td>
        <td><strong>Requisition</strong><br>${escapeHtml(order.requisition?.reference ?? "—")}</td>
        <td><strong>Supplier address</strong><br>${escapeHtml(order.supplier?.address ?? "—")}</td>
      </tr>
    </table>
    ${transportBlock}
  </div>
  <table class="lines">
    <thead>
      <tr>
        <th>Supplied</th>
        <th style="width: 32px;">#</th>
        <th>Material</th>
        <th>SKU / Code</th>
        <th class="numeric">Order Qty</th>
        <th class="numeric">Confirmed in warehouse</th>
        <th class="numeric">Unit price (KES)</th>
        <th class="numeric">Line total (KES)</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || '<tr><td colspan="8" class="muted">No line items</td></tr>'}
    </tbody>
  </table>
  <table class="totals">
    <tr><td class="label">Subtotal</td><td class="amount">KES ${formatMoney(order.subtotal)}</td></tr>
    <tr><td class="label">Tax</td><td class="amount">KES ${formatMoney(order.tax)}</td></tr>
    <tr><td class="label"><strong>Total</strong></td><td class="amount"><strong>KES ${formatMoney(order.total)}</strong></td></tr>
  </table>
  <div class="instructions">
    <strong>Supplier instructions</strong><br>
    <span class="muted">Tick the &ldquo;Supplied&rdquo; checkbox for each item included on this delivery.
    Warehouse staff will record confirmed quantities on receipt; re-print this document after goods receipt to see updated confirmation totals.</span>
  </div>
  <table class="signatures">
    <tr>
      <td>
        <div class="sign-label">Prepared by (Bibo procurement)</div>
        <div class="sign-line">Name, signature &amp; date</div>
      </td>
      <td>
        <div class="sign-label">Supplier acknowledgement</div>
        <div class="sign-line">Name, signature &amp; date</div>
      </td>
    </tr>
  </table>
  <p class="muted" style="margin-top: 24px;">
    Generated by Bibo ERP procurement.
  </p>
</body>
</html>`;
}
