import { describe, expect, it } from "vitest";
import {
  dedupeLinesForSketch,
  groupLinesByFloor,
  sketchSignature,
} from "@/lib/measurements/auto-sketch";
import { emptyMeasurementLine } from "@/lib/measurements/types";

describe("auto sketch helpers", () => {
  it("combines identical product dimensions into one symbol with total quantity", () => {
    const lines = [
      {
        ...emptyMeasurementLine(),
        product_type: "Casement Window",
        width_centre_mm: 1200,
        height_centre_mm: 1500,
        quantity: 2,
        unit_floor: "Ground",
      },
      {
        ...emptyMeasurementLine(),
        product_type: "casement window",
        width_centre_mm: 1200,
        height_centre_mm: 1500,
        quantity: 3,
        unit_floor: "Ground",
      },
    ];

    const symbols = dedupeLinesForSketch(lines);
    expect(symbols).toHaveLength(1);
    expect(symbols[0]?.quantity).toBe(5);
    expect(sketchSignature(lines[0]!)).toBe(sketchSignature(lines[1]!));
  });

  it("groups deduplicated symbols by floor", () => {
    const pages = groupLinesByFloor([
      {
        ...emptyMeasurementLine(),
        unit_floor: "First",
        product_type: "Door",
        width_centre_mm: 900,
        height_centre_mm: 2100,
      },
      {
        ...emptyMeasurementLine(),
        unit_floor: "Ground",
        product_type: "Window",
        width_centre_mm: 1000,
        height_centre_mm: 1200,
      },
    ]);

    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.floor)).toEqual(["First", "Ground"]);
  });
});
