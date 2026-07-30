import { describe, expect, it } from "vitest";
import {
  dedupeLinesForSketch,
  detectProductKind,
  groupLinesByFloor,
  sketchSignature,
} from "@/lib/measurements/auto-sketch";
import { splitOrthographicPanels } from "@/lib/measurements/auto-sketch-specialized";
import { emptyMeasurementLine } from "@/lib/measurements/types";

describe("auto sketch helpers", () => {
  it("combines identical product dimensions into one symbol with total quantity", () => {
    const lines = [
      {
        ...emptyMeasurementLine(),
        product_type: "Window" as const,
        width_centre_mm: 1200,
        height_centre_mm: 1500,
        quantity: 2,
        unit_floor: "Ground",
      },
      {
        ...emptyMeasurementLine(),
        product_type: "Window" as const,
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

  it("keeps symbols with different wall dimensions separate", () => {
    const first = {
      ...emptyMeasurementLine(),
      product_type: "Bathroom" as const,
      width_centre_mm: 1200,
      height_centre_mm: 2100,
      wall_height_mm: 2600,
      wall_thickness_mm: 150,
    };
    const second = {
      ...first,
      wall_thickness_mm: 200,
    };

    expect(dedupeLinesForSketch([first, second])).toHaveLength(2);
  });

  it("uses balcony detail dimensions for sketches", () => {
    const line = {
      ...emptyMeasurementLine(),
      product_type: "Balcony" as const,
      balcony_details: {
        balcony_type: "edge" as const,
        overall_width_mm: 3200,
        overall_projection_mm: 1400,
        balcony_height_mm: 1100,
        wall_thickness_mm: 200,
        left_side: { condition: "full_wall" as const },
        right_side: { condition: "open" as const },
        front_edge: {
          barricade_height_mm: 900,
          open_height_above_barricade_mm: 1100,
        },
      },
    };

    const symbols = dedupeLinesForSketch([line]);
    expect(symbols).toHaveLength(1);
    expect(symbols[0]?.width_mm).toBe(3200);
    expect(symbols[0]?.height_mm).toBe(1400);
    expect(symbols[0]?.wall_thickness_mm).toBe(200);
    expect(symbols[0]?.balcony_details?.balcony_type).toBe("edge");
    expect(sketchSignature(line)).toContain("edge");
  });

  it("changes balcony signature when barricade or open height changes", () => {
    const base = {
      ...emptyMeasurementLine(),
      product_type: "Balcony" as const,
      balcony_details: {
        balcony_type: "floating" as const,
        overall_width_mm: 3000,
        overall_projection_mm: 1200,
        front_edge: {
          barricade_height_mm: 900,
          open_height_above_barricade_mm: 1000,
        },
      },
    };
    const changed = {
      ...base,
      balcony_details: {
        ...base.balcony_details,
        front_edge: {
          barricade_height_mm: 1400,
          open_height_above_barricade_mm: 800,
        },
      },
    };

    expect(sketchSignature(base)).not.toBe(sketchSignature(changed));
    expect(dedupeLinesForSketch([base, changed])).toHaveLength(2);
  });

  it("uses shower detail dimensions for sketches", () => {
    const line = {
      ...emptyMeasurementLine(),
      product_type: "Bathroom" as const,
      shower_details: {
        shower_type: "corner_l" as const,
        overall_width_mm: 900,
        overall_depth_mm: 900,
        overall_height_mm: 2000,
        ceiling_height_mm: 2400,
        kerb_height_mm: 120,
      },
    };

    const symbols = dedupeLinesForSketch([line]);
    expect(symbols).toHaveLength(1);
    expect(symbols[0]?.width_mm).toBe(900);
    expect(symbols[0]?.height_mm).toBe(2000);
    expect(symbols[0]?.wall_height_mm).toBe(2400);
    expect(symbols[0]?.shower_details?.shower_type).toBe("corner_l");
  });

  it("changes shower signature when type changes", () => {
    const straight = {
      ...emptyMeasurementLine(),
      product_type: "Bathroom" as const,
      shower_details: {
        shower_type: "straight" as const,
        overall_width_mm: 1000,
        overall_depth_mm: 900,
        overall_height_mm: 2000,
      },
    };
    const uShape = {
      ...straight,
      shower_details: {
        ...straight.shower_details,
        shower_type: "u_shape" as const,
      },
    };

    expect(sketchSignature(straight)).not.toBe(sketchSignature(uShape));
  });

  it("supports the four measurement product views", () => {
    expect(detectProductKind("Door")).toBe("door");
    expect(detectProductKind("Window")).toBe("window");
    expect(detectProductKind("Balcony")).toBe("balcony");
    expect(detectProductKind("Bathroom")).toBe("bathroom");
  });

  it("splits orthographic panels into top, side, and front", () => {
    const panels = splitOrthographicPanels(0, 0, 900, 260, 10);
    expect(panels.top.width + panels.side.width + panels.front.width + 20).toBe(
      900,
    );
    expect(panels.side.x).toBe(panels.top.x + panels.top.width + 10);
    expect(panels.front.x).toBe(panels.side.x + panels.side.width + 10);
    expect(panels.top.height).toBe(260);
  });
});
