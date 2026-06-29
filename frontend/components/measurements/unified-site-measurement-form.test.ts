import { describe, expect, it } from "vitest";
import {
  emptyMeasurementLine,
  hasSiteMeasurementFormData,
  isMeasurementFormLocked,
} from "@/lib/measurements/types";

describe("site measurement form helpers", () => {
  it("detects form data from lines", () => {
    expect(
      hasSiteMeasurementFormData({
        lines: [{ ...emptyMeasurementLine(), room_location: "Kitchen" }],
      }),
    ).toBe(true);
  });

  it("locks submitted and approved forms", () => {
    expect(isMeasurementFormLocked("submitted")).toBe(true);
    expect(isMeasurementFormLocked("approved")).toBe(true);
    expect(isMeasurementFormLocked("draft")).toBe(false);
  });
});
