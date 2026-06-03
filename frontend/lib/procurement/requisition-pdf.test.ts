import { describe, expect, it } from "vitest";
import { buildRequisitionPdfHtml } from "./requisition-pdf";
import type { PurchaseRequisition } from "@/lib/api/procurement";

const sample: PurchaseRequisition = {
  id: 1,
  reference: "PR-2025-001",
  project_id: 2,
  status: "pending_approval",
  notes: "Rush order",
  created_at: "2025-05-31T10:00:00Z",
  project: { id: 2, reference: "PJ-1", name: "Karen Villa", stage: "procurement" },
  requester: { id: 1, name: "Alex Admin", email: "alex@bibo.test" },
  lines: [
    {
      id: 10,
      description: "Aluminium profile",
      quantity: "12.500",
      required_quantity: "10.000",
      trigger_type: "project_material",
      sku: "ALU-100",
      unit_of_measure: "m",
    },
  ],
};

describe("buildRequisitionPdfHtml", () => {
  it("includes requisition reference and line material", () => {
    const html = buildRequisitionPdfHtml(sample);
    expect(html).toContain("PR-2025-001");
    expect(html).toContain("Aluminium profile");
    expect(html).toContain("Admin approval sign-off");
    expect(html).toContain("Rush order");
  });
});
