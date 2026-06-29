import { describe, expect, it } from "vitest";
import {
  APPROVABLE_QUOTATION_STATUSES,
  formatQuotationStatus,
  QUOTATION_RELEASE_PERMISSIONS,
  quotationReleaseActionLabel,
  quotationStatusDescription,
  SENDABLE_QUOTATION_STATUSES,
  SUBMITTABLE_QUOTATION_STATUSES,
} from "@/lib/quotations/status";

describe("quotation status helpers", () => {
  it("labels draft and internal review clearly", () => {
    expect(formatQuotationStatus("draft")).toBe("Draft");
    expect(formatQuotationStatus("internal_review")).toBe("Pending approval");
    expect(formatQuotationStatus("approved")).toBe("Approved");
  });

  it("separates submit, approve, and send steps", () => {
    expect(SUBMITTABLE_QUOTATION_STATUSES.has("draft")).toBe(true);
    expect(APPROVABLE_QUOTATION_STATUSES.has("internal_review")).toBe(true);
    expect(SENDABLE_QUOTATION_STATUSES.has("draft")).toBe(false);
    expect(SENDABLE_QUOTATION_STATUSES.has("internal_review")).toBe(false);
    expect(SENDABLE_QUOTATION_STATUSES.has("approved")).toBe(true);
  });

  it("allows release with send or approve permission", () => {
    expect(QUOTATION_RELEASE_PERMISSIONS).toContain("quotations.send");
    expect(QUOTATION_RELEASE_PERMISSIONS).toContain("quotations.approve");
  });

  it("provides guidance copy for each workflow step", () => {
    expect(quotationStatusDescription("draft")).toContain("submit for approval");
    expect(quotationStatusDescription("internal_review")).toContain("manager");
    expect(quotationStatusDescription("approved")).toContain("send to the client");
  });

  it("maps release action labels by status", () => {
    expect(quotationReleaseActionLabel("internal_review")).toBe("Approve quotation");
    expect(quotationReleaseActionLabel("approved")).toBe("Send to client");
  });
});
