import { describe, expect, it } from "vitest";
import {
  isAdminOnlyLocationLabel,
  resolveKenyaAdminFromNominatimAddress,
  resolveSubcountyForCounty,
} from "./kenya-locations";

describe("resolveKenyaAdminFromNominatimAddress", () => {
  it("maps Kasarani division in city_district to Nairobi sub-county Kasarani", () => {
    const admin = resolveKenyaAdminFromNominatimAddress({
      county: "Nairobi",
      state: "Nairobi",
      city: "Nairobi",
      city_district: "Kasarani division",
    });

    expect(admin.countySlug).toBe("nairobi");
    expect(admin.countyLabel).toBe("Nairobi");
    expect(admin.subcounty).toBe("Kasarani");
    expect(admin.ward).toBeNull();
  });

  it("maps Kasarani division in county_district to sub-county Kasarani", () => {
    const admin = resolveKenyaAdminFromNominatimAddress({
      county: "Nairobi County",
      county_district: "Kasarani division",
      state_district: "Kasarani division",
    });

    expect(admin.subcounty).toBe("Kasarani");
    expect(admin.ward).toBeNull();
  });

  it("keeps a genuine ward when it does not match a sub-county", () => {
    const admin = resolveKenyaAdminFromNominatimAddress({
      county: "Nairobi",
      city_district: "Kasarani division",
      suburb: "Sunton Estate",
    });

    expect(admin.subcounty).toBe("Kasarani");
    expect(admin.ward).toBe("Sunton Estate");
  });
});

describe("resolveSubcountyForCounty", () => {
  it("normalizes division suffix to a dropdown option", () => {
    expect(resolveSubcountyForCounty("nairobi", "Kasarani division")).toBe(
      "Kasarani",
    );
  });
});

describe("isAdminOnlyLocationLabel", () => {
  it("detects admin-only division labels", () => {
    expect(
      isAdminOnlyLocationLabel("Kasarani division, Nairobi", {
        countyLabel: "Nairobi",
        subcounty: "Kasarani",
        ward: null,
      }),
    ).toBe(true);
  });

  it("allows street-level labels", () => {
    expect(
      isAdminOnlyLocationLabel("Thika Road, Kasarani, Nairobi"),
    ).toBe(false);
  });
});
