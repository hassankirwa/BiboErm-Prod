import { describe, expect, it } from "vitest";
import { buildPurchaseOrderPdfHtml } from "./purchase-order-pdf";

describe("buildPurchaseOrderPdfHtml", () => {
  it("includes supplier checkboxes and warehouse confirmation column", () => {
    const html = buildPurchaseOrderPdfHtml({
      id: 1,
      reference: "PO-2026-001",
      supplier_id: 3,
      project_id: null,
      requisition_id: 9,
      status: "draft",
      subtotal: "1000.00",
      tax: "0.00",
      total: "1000.00",
      expected_delivery: null,
      created_at: "2026-05-31T10:00:00.000Z",
      supplier: {
        id: 3,
        code: "SUP-001",
        name: "Steel Works Ltd",
        category: "steel",
        email: "orders@steel.test",
        phone: "+254700000001",
        address: "Industrial Area",
        is_preferred: true,
        is_active: true,
      },
      requisition: { id: 9, reference: "PR-2026-009" },
      lines: [
        {
          id: 1,
          description: "Angle iron 40x40",
          sku: "ANG-4040",
          quantity: "12.000",
          unit_price: "50.00",
          line_total: "600.00",
          received_qty: "8.000",
        },
      ],
      transport_orders: [
        {
          id: 1,
          transport_number: "TR-001",
          transport_type: "supplier_delivery",
          vehicle: "KAA 123A",
          driver_id: 2,
          driver_name: "John Driver",
          driver_phone: "+254711111111",
          expected_arrival: "2026-06-02",
          status: "scheduled",
        },
      ],
    });

    expect(html).toContain("Purchase Order");
    expect(html).toContain("Supplied");
    expect(html).toContain("Confirmed in warehouse");
    expect(html).toContain("class=\"checkbox\"");
    expect(html).toContain("8.000");
    expect(html).toContain("Steel Works Ltd");
    expect(html).toContain("John Driver");
    expect(html).toContain('src="/bibo-logo.png"');
  });
});
