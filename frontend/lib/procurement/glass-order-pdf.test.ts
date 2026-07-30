import { describe, expect, it } from "vitest";
import { buildGlassOrderPdfHtml } from "./glass-order-pdf";
import type { GlassOrder } from "@/lib/api/procurement";

const sample: GlassOrder = {
  id: 1,
  order_number: "GLS-2026-001",
  project_id: 2,
  supplier_id: 5,
  purchase_order_id: null,
  purchase_requisition_id: 9,
  specs: {
    requirements: "6mm tempered clear, polished edges",
    panes: [
      {
        name: "Window 1",
        width_mm: 1200,
        height_mm: 800,
        quantity: 2,
        glass_type: "Tempered",
        tint: "Clear",
      },
    ],
  },
  status: "ordered",
  ordered_at: "2026-07-20T10:00:00Z",
  expected_delivery: "2026-07-28",
  delivered_at: null,
  delivery_location: "Bibo factory",
  notes: "Handle with care",
  currency: "KES",
  created_at: "2026-07-19T08:00:00Z",
  project: { id: 2, reference: "PJ-1", name: "Karen Villa" },
  supplier: {
    id: 5,
    code: "GLASS-02",
    name: "Supplier 2 Glass Ltd",
    category: "glass",
    phone: "+254700000000",
    email: "orders@supplier2.test",
  },
  creator: { id: 1, name: "Pat Procurement", email: "pat@bibo.test" },
};

describe("buildGlassOrderPdfHtml", () => {
  it("includes logo branding, supplier, and pane schedule", () => {
    const html = buildGlassOrderPdfHtml(sample, { logoUrl: "/bibo-logo.png" });
    expect(html).toContain("Glass Purchase Order");
    expect(html).toContain('src="/bibo-logo.png"');
    expect(html).toContain("GLS-2026-001");
    expect(html).toContain("Supplier 2 Glass Ltd");
    expect(html).toContain("Tempered");
    expect(html).toContain("1200 × 800 mm");
    expect(html).toContain("Supplier acknowledgement");
    expect(html).toContain("Handle with care");
  });
});
