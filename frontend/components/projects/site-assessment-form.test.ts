import { describe, expect, it } from "vitest";
import {
  resizeMeasurementItems,
  resizeSpatialItems,
} from "./site-assessment-form";
import type {
  SiteAssessmentMeasurementItem,
  SiteAssessmentSpatialItem,
} from "@/lib/api/projects";

describe("resizeMeasurementItems", () => {
  const existing: SiteAssessmentMeasurementItem[] = [
    { label: "Door 1", width_ft: 3, height_ft: 7, notes: "Main entry" },
    { label: "Door 2", width_ft: 2.5, height_ft: 7, notes: "Bedroom" },
    { label: "Door 3", width_ft: 2, height_ft: 6.5, notes: "Bath" },
    { label: "Door 4", width_ft: 4, height_ft: 8, notes: "Patio" },
  ];

  it("keeps existing items when increasing count", () => {
    const result = resizeMeasurementItems(6, existing, "Door");

    expect(result).toHaveLength(6);
    expect(result.slice(0, 4)).toEqual(existing);
    expect(result[4]).toMatchObject({ label: "Door 5", width_ft: null, notes: "" });
    expect(result[5]).toMatchObject({ label: "Door 6", width_ft: null, notes: "" });
  });

  it("trims items when decreasing count", () => {
    const result = resizeMeasurementItems(4, existing, "Door");

    expect(result).toHaveLength(4);
    expect(result).toEqual(existing);
  });
});

describe("resizeSpatialItems", () => {
  const existing: SiteAssessmentSpatialItem[] = [
    {
      label: "Bathroom 1",
      shape: "rectangle",
      width_ft: 5,
      height_ft: 8,
      notes: "Master",
      dimensions_description: "",
      side_measurements_ft: null,
      images: [{ path: "private/site-assessment/project-1/a.jpg", original_name: "a.jpg" }],
    },
  ];

  it("preserves images and measurements when count stays the same", () => {
    const result = resizeSpatialItems(1, existing, "Bathroom");

    expect(result).toHaveLength(1);
    expect(result[0].images).toEqual(existing[0].images);
    expect(result[0].notes).toBe("Master");
  });

  it("preserves existing items and adds empty slots when increasing count", () => {
    const result = resizeSpatialItems(3, existing, "Bathroom");

    expect(result).toHaveLength(3);
    expect(result[0].images).toEqual(existing[0].images);
    expect(result[1]).toMatchObject({ label: "Bathroom 2", images: [] });
    expect(result[2]).toMatchObject({ label: "Bathroom 3", images: [] });
  });
});
