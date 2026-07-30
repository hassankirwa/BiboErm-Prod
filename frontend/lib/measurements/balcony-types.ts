export type BalconyType =
  | "between_two_walls"
  | "edge"
  | "floating"
  | "l_shaped"
  | "u_shaped"
  | "curved"
  | "irregular";

export type BalconyCornerType = "square" | "chamfered" | "curved";

export type BalconyFrontEdgeShape = "straight" | "curved";

/** Full-height side wall vs open side with low barricade / parapet. */
export type BalconySideCondition = "full_wall" | "open";

export type AnglePreset = "90" | "135" | "180" | "custom";

export type BalconyGlassSystem =
  | "post_system"
  | "u_channel"
  | "base_shoe"
  | "spigot"
  | "standoff"
  | "frameless"
  | "other";

export type BalconyGlassType =
  | "toughened"
  | "laminated"
  | "toughened_laminated"
  | "other";

export type BalconyGlassColour =
  | "clear"
  | "ultra_clear"
  | "grey"
  | "bronze"
  | "frosted"
  | "other";

export type BalconyHandrail =
  | "none"
  | "round"
  | "square"
  | "slotted"
  | "timber"
  | "stainless_steel";

export type BalconyObstruction =
  | "ac_unit"
  | "downpipe"
  | "light"
  | "socket"
  | "column"
  | "beam"
  | "other";

export type NamedAngle = {
  name: string;
  preset?: AnglePreset | null;
  custom_degrees?: number | null;
};

export type BalconySideMeasurements = {
  /**
   * full_wall = solid wall for the full balcony height (left/right only).
   * open = low barricade/parapet; measure open height from top of barricade upward.
   * The building entrance door at the top is never a "wall".
   */
  condition?: BalconySideCondition | null;
  wall_length_mm?: number | null;
  open_edge_length_mm?: number | null;
  /** Height of the low barricade / parapet wall (typical ~1/3, 1/2, or ~1400 mm). */
  barricade_height_mm?: number | null;
  /** Open / glass height from top of barricade to top of balcony opening. */
  open_height_above_barricade_mm?: number | null;
  angle_preset?: AnglePreset | null;
  angle_custom_degrees?: number | null;
  corner_type?: BalconyCornerType | null;
};

export type BalconyFrontEdge = {
  total_length_mm?: number | null;
  shape?: BalconyFrontEdgeShape | null;
  curve_radius_mm?: number | null;
  barricade_height_mm?: number | null;
  open_height_above_barricade_mm?: number | null;
  /** Facet lengths for irregular (three equal front edges). */
  facet_1_length_mm?: number | null;
  facet_2_length_mm?: number | null;
  facet_3_length_mm?: number | null;
};

export type BalconyCurvedSection = {
  radius_mm?: number | null;
  diameter_mm?: number | null;
  arc_length_mm?: number | null;
  start_point?: string | null;
  end_point?: string | null;
};

export type BalconyMeasurementDetails = {
  balcony_type?: BalconyType | null;
  overall_width_mm?: number | null;
  overall_projection_mm?: number | null;
  ffl_to_slab_mm?: number | null;
  balcony_height_mm?: number | null;
  left_side?: BalconySideMeasurements | null;
  right_side?: BalconySideMeasurements | null;
  front_edge?: BalconyFrontEdge | null;
  slab_thickness_mm?: number | null;
  wall_thickness_mm?: number | null;
  step_height_mm?: number | null;
  kerb_height_mm?: number | null;
  kerb_width_mm?: number | null;
  floor_slope_mm?: number | null;
  drain_position?: string | null;
  drain_distance_from_left_mm?: number | null;
  drain_distance_from_front_mm?: number | null;
  curved_sections?: BalconyCurvedSection[];
  angles?: NamedAngle[];
  wall_finish?: string | null;
  floor_finish?: string | null;
  waterproofing_present?: boolean | null;
  expansion_joint?: boolean | null;
  obstructions?: BalconyObstruction[];
  obstruction_other?: string | null;
  glass_system?: BalconyGlassSystem | null;
  glass_system_other?: string | null;
  glass_thickness_mm?: number | null;
  glass_type?: BalconyGlassType | null;
  glass_type_other?: string | null;
  glass_colour?: BalconyGlassColour | null;
  glass_colour_other?: string | null;
  handrail?: BalconyHandrail | null;
  accessories_material?: string | null;
  accessories_finish?: string | null;
  accessories_colour?: string | null;
};

export const BALCONY_TYPE_OPTIONS: {
  value: BalconyType;
  label: string;
  description: string;
  image: string;
}[] = [
  {
    value: "between_two_walls",
    label: "Between Two Full Walls",
    description:
      "Door at the building face (top). Full-height walls on left and right. Only the front end is open with a barricade — measure the open height above that barricade.",
    image: "/measurements/balcony-types/between-two-walls.svg",
  },
  {
    value: "edge",
    label: "One Full Wall (Edge)",
    description:
      "Door at the building face (top). One side (left or right) is a full-height wall; the other side and front are open with barricades.",
    image: "/measurements/balcony-types/edge.svg",
  },
  {
    value: "floating",
    label: "Three Open Sides (Floating)",
    description:
      "Door at the building face (top). No full side walls — left, right, and front are open with barricades; measure open height above each barricade.",
    image: "/measurements/balcony-types/floating.svg",
  },
  {
    value: "u_shaped",
    label: "U-Shaped Balcony",
    description:
      "Door at the building face. Plan wraps as a U; ends/returns may be full walls or open barricades.",
    image: "/measurements/balcony-types/u-shaped.svg",
  },
  {
    value: "irregular",
    label: "Irregular (Three Equal Front Edges)",
    description:
      "Door at the building face. Front has three equal open edges (bay / canted). Measure each edge length and the open height above the barricade.",
    image: "/measurements/balcony-types/irregular.svg?v=3",
  },
  {
    value: "curved",
    label: "Curved Balcony",
    description:
      "Door at the building face. Front edge is a smooth curve — measure radius or arc length, barricade height, and open height above the barricade.",
    image: "/measurements/balcony-types/curved.svg?v=3",
  },
];

export const BALCONY_SIDE_CONDITION_OPTIONS: {
  value: BalconySideCondition;
  label: string;
}[] = [
  { value: "full_wall", label: "Full-height wall" },
  { value: "open", label: "Open (barricade + open height)" },
];

export const BALCONY_CORNER_TYPE_OPTIONS: {
  value: BalconyCornerType;
  label: string;
}[] = [
  { value: "square", label: "Square" },
  { value: "chamfered", label: "Chamfered" },
  { value: "curved", label: "Curved" },
];

export const ANGLE_PRESET_OPTIONS: { value: AnglePreset; label: string }[] = [
  { value: "90", label: "90°" },
  { value: "135", label: "135°" },
  { value: "180", label: "180°" },
  { value: "custom", label: "Custom" },
];

export const BALCONY_DEFAULT_ANGLE_NAMES = [
  "Left Corner",
  "Front Left Corner",
  "Front Right Corner",
  "Right Corner",
] as const;

export const BALCONY_OBSTRUCTION_OPTIONS: {
  value: BalconyObstruction;
  label: string;
}[] = [
  { value: "ac_unit", label: "AC Unit" },
  { value: "downpipe", label: "Downpipe" },
  { value: "light", label: "Light" },
  { value: "socket", label: "Socket" },
  { value: "column", label: "Column" },
  { value: "beam", label: "Beam" },
  { value: "other", label: "Other" },
];

export const BALCONY_GLASS_SYSTEM_OPTIONS: {
  value: BalconyGlassSystem;
  label: string;
}[] = [
  { value: "post_system", label: "Post System" },
  { value: "u_channel", label: "U-Channel" },
  { value: "base_shoe", label: "Base Shoe" },
  { value: "spigot", label: "Spigot" },
  { value: "standoff", label: "Standoff" },
  { value: "frameless", label: "Frameless" },
  { value: "other", label: "Other" },
];

export const BALCONY_GLASS_TYPE_OPTIONS: {
  value: BalconyGlassType;
  label: string;
}[] = [
  { value: "toughened", label: "Toughened" },
  { value: "laminated", label: "Laminated" },
  { value: "toughened_laminated", label: "Toughened Laminated" },
  { value: "other", label: "Other" },
];

export const BALCONY_GLASS_COLOUR_OPTIONS: {
  value: BalconyGlassColour;
  label: string;
}[] = [
  { value: "clear", label: "Clear" },
  { value: "ultra_clear", label: "Ultra Clear" },
  { value: "grey", label: "Grey" },
  { value: "bronze", label: "Bronze" },
  { value: "frosted", label: "Frosted" },
  { value: "other", label: "Other" },
];

export const BALCONY_HANDRAIL_OPTIONS: {
  value: BalconyHandrail;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
  { value: "slotted", label: "Slotted" },
  { value: "timber", label: "Timber" },
  { value: "stainless_steel", label: "Stainless Steel" },
];

export function emptyBalconySide(): BalconySideMeasurements {
  return {
    condition: null,
    wall_length_mm: null,
    open_edge_length_mm: null,
    barricade_height_mm: null,
    open_height_above_barricade_mm: null,
    angle_preset: null,
    angle_custom_degrees: null,
    corner_type: null,
  };
}

export function emptyBalconyCurvedSection(): BalconyCurvedSection {
  return {
    radius_mm: null,
    diameter_mm: null,
    arc_length_mm: null,
    start_point: "",
    end_point: "",
  };
}

export function emptyBalconyDetails(): BalconyMeasurementDetails {
  return {
    balcony_type: null,
    overall_width_mm: null,
    overall_projection_mm: null,
    ffl_to_slab_mm: null,
    balcony_height_mm: null,
    left_side: emptyBalconySide(),
    right_side: emptyBalconySide(),
    front_edge: {
      total_length_mm: null,
      shape: null,
      curve_radius_mm: null,
      barricade_height_mm: null,
      open_height_above_barricade_mm: null,
      facet_1_length_mm: null,
      facet_2_length_mm: null,
      facet_3_length_mm: null,
    },
    slab_thickness_mm: null,
    wall_thickness_mm: null,
    step_height_mm: null,
    kerb_height_mm: null,
    kerb_width_mm: null,
    floor_slope_mm: null,
    drain_position: "",
    drain_distance_from_left_mm: null,
    drain_distance_from_front_mm: null,
    curved_sections: [],
    angles: BALCONY_DEFAULT_ANGLE_NAMES.map((name) => ({
      name,
      preset: null,
      custom_degrees: null,
    })),
    wall_finish: "",
    floor_finish: "",
    waterproofing_present: null,
    expansion_joint: null,
    obstructions: [],
    obstruction_other: "",
    glass_system: null,
    glass_system_other: "",
    glass_thickness_mm: null,
    glass_type: null,
    glass_type_other: "",
    glass_colour: null,
    glass_colour_other: "",
    handrail: null,
    accessories_material: "",
    accessories_finish: "",
    accessories_colour: "",
  };
}

export function balconyTypeLabel(value?: BalconyType | null): string {
  if (!value) return "—";
  if (value === "l_shaped") {
    return "L-Shaped Balcony";
  }
  return BALCONY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function hasBalconyDetailsData(
  details?: BalconyMeasurementDetails | null,
): boolean {
  if (!details) return false;
  if (details.balcony_type) return true;
  return [
    details.overall_width_mm,
    details.overall_projection_mm,
    details.ffl_to_slab_mm,
    details.balcony_height_mm,
  ].some((value) => value != null && value > 0);
}
