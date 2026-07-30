import type { AnglePreset, NamedAngle } from "@/lib/measurements/balcony-types";

export type ShowerType =
  | "straight"
  | "corner_l"
  | "u_shape"
  | "neo_angle"
  | "walk_in"
  | "bathtub_screen"
  | "custom";

export type ShowerDesign =
  | "sliding"
  | "swing"
  | "pivot"
  | "bi_fold"
  | "fixed_screen"
  | "walk_in"
  | "custom";

export type ShowerGlassType =
  | "toughened"
  | "laminated"
  | "toughened_laminated"
  | "other";

export type ShowerGlassColour =
  | "clear"
  | "ultra_clear"
  | "grey"
  | "bronze"
  | "frosted"
  | "other";

export type ShowerHardwareFinish =
  | "black"
  | "brushed_gold"
  | "chrome"
  | "brushed_nickel"
  | "satin"
  | "white"
  | "custom";

export type ShowerSealType = "magnetic" | "pvc" | "silicone" | "water_deflector";

export type ShowerObstruction =
  | "out_of_plumb_walls"
  | "other";

export type ShowerWallMeasurements = {
  width_mm?: number | null;
  vertical_plumb_mm?: number | null;
  angle_preset?: AnglePreset | null;
  angle_custom_degrees?: number | null;
};

export type ShowerMeasurementDetails = {
  shower_type?: ShowerType | null;
  overall_width_mm?: number | null;
  overall_depth_mm?: number | null;
  overall_height_mm?: number | null;
  finished_floor_level_mm?: number | null;
  ceiling_height_mm?: number | null;
  kerb_height_mm?: number | null;
  kerb_width_mm?: number | null;
  kerb_thickness_mm?: number | null;
  left_wall?: ShowerWallMeasurements | null;
  right_wall?: ShowerWallMeasurements | null;
  back_wall?: ShowerWallMeasurements | null;
  angles?: NamedAngle[];
  drain_centre_from_left_mm?: number | null;
  drain_centre_from_back_mm?: number | null;
  drain_diameter_mm?: number | null;
  shower_head_height_mm?: number | null;
  shower_arm_projection_mm?: number | null;
  mixer_height_mm?: number | null;
  niche_position?: string | null;
  toilet_clearance_mm?: number | null;
  toilet_projection_mm?: number | null;
  vanity_clearance_mm?: number | null;
  wall_tiles_installed?: boolean | null;
  floor_tiles_installed?: boolean | null;
  waterproofing_completed?: boolean | null;
  ceiling_finished?: boolean | null;
  out_of_plumb_walls?: boolean | null;
  obstructions?: string | null;
  design?: ShowerDesign | null;
  glass_thickness_mm?: number | null;
  glass_type?: ShowerGlassType | null;
  glass_type_other?: string | null;
  glass_colour?: ShowerGlassColour | null;
  glass_colour_other?: string | null;
  hardware_hinges?: boolean | null;
  hardware_handles?: boolean | null;
  hardware_rollers?: boolean | null;
  hardware_stabilizer_bar?: boolean | null;
  hardware_u_channel?: boolean | null;
  hardware_finish?: ShowerHardwareFinish | null;
  hardware_finish_custom?: string | null;
  seal_type?: ShowerSealType | null;
};

export const SHOWER_TYPE_OPTIONS: { value: ShowerType; label: string }[] = [
  { value: "straight", label: "Straight (One Panel)" },
  { value: "corner_l", label: "Corner (L Shape)" },
  { value: "u_shape", label: "U Shape" },
  { value: "neo_angle", label: "Neo-Angle" },
  { value: "walk_in", label: "Walk-in" },
  { value: "bathtub_screen", label: "Bathtub Screen" },
  { value: "custom", label: "Custom" },
];

export const SHOWER_DEFAULT_ANGLE_NAMES = [
  "Left Corner",
  "Right Corner",
  "Front Corner",
] as const;

export const SHOWER_DESIGN_OPTIONS: { value: ShowerDesign; label: string }[] = [
  { value: "sliding", label: "Sliding" },
  { value: "swing", label: "Swing" },
  { value: "pivot", label: "Pivot" },
  { value: "bi_fold", label: "Bi-fold" },
  { value: "fixed_screen", label: "Fixed Screen" },
  { value: "walk_in", label: "Walk-in" },
  { value: "custom", label: "Custom" },
];

export const SHOWER_GLASS_TYPE_OPTIONS: {
  value: ShowerGlassType;
  label: string;
}[] = [
  { value: "toughened", label: "Toughened" },
  { value: "laminated", label: "Laminated" },
  { value: "toughened_laminated", label: "Toughened Laminated" },
  { value: "other", label: "Other" },
];

export const SHOWER_GLASS_COLOUR_OPTIONS: {
  value: ShowerGlassColour;
  label: string;
}[] = [
  { value: "clear", label: "Clear" },
  { value: "ultra_clear", label: "Ultra Clear" },
  { value: "grey", label: "Grey" },
  { value: "bronze", label: "Bronze" },
  { value: "frosted", label: "Frosted" },
  { value: "other", label: "Other" },
];

export const SHOWER_HARDWARE_FINISH_OPTIONS: {
  value: ShowerHardwareFinish;
  label: string;
}[] = [
  { value: "black", label: "Black" },
  { value: "brushed_gold", label: "Brushed Gold" },
  { value: "chrome", label: "Chrome" },
  { value: "brushed_nickel", label: "Brushed Nickel" },
  { value: "satin", label: "Satin" },
  { value: "white", label: "White" },
  { value: "custom", label: "Custom" },
];

export const SHOWER_SEAL_TYPE_OPTIONS: {
  value: ShowerSealType;
  label: string;
}[] = [
  { value: "magnetic", label: "Magnetic" },
  { value: "pvc", label: "PVC" },
  { value: "silicone", label: "Silicone" },
  { value: "water_deflector", label: "Water Deflector" },
];

export function emptyShowerWall(): ShowerWallMeasurements {
  return {
    width_mm: null,
    vertical_plumb_mm: null,
    angle_preset: null,
    angle_custom_degrees: null,
  };
}

export function emptyShowerDetails(): ShowerMeasurementDetails {
  return {
    shower_type: null,
    overall_width_mm: null,
    overall_depth_mm: null,
    overall_height_mm: null,
    finished_floor_level_mm: null,
    ceiling_height_mm: null,
    kerb_height_mm: null,
    kerb_width_mm: null,
    kerb_thickness_mm: null,
    left_wall: emptyShowerWall(),
    right_wall: emptyShowerWall(),
    back_wall: emptyShowerWall(),
    angles: SHOWER_DEFAULT_ANGLE_NAMES.map((name) => ({
      name,
      preset: null,
      custom_degrees: null,
    })),
    drain_centre_from_left_mm: null,
    drain_centre_from_back_mm: null,
    drain_diameter_mm: null,
    shower_head_height_mm: null,
    shower_arm_projection_mm: null,
    mixer_height_mm: null,
    niche_position: "",
    toilet_clearance_mm: null,
    toilet_projection_mm: null,
    vanity_clearance_mm: null,
    wall_tiles_installed: null,
    floor_tiles_installed: null,
    waterproofing_completed: null,
    ceiling_finished: null,
    out_of_plumb_walls: null,
    obstructions: "",
    design: null,
    glass_thickness_mm: null,
    glass_type: null,
    glass_type_other: "",
    glass_colour: null,
    glass_colour_other: "",
    hardware_hinges: null,
    hardware_handles: null,
    hardware_rollers: null,
    hardware_stabilizer_bar: null,
    hardware_u_channel: null,
    hardware_finish: null,
    hardware_finish_custom: "",
    seal_type: null,
  };
}

export function showerTypeLabel(value?: ShowerType | null): string {
  if (!value) return "—";
  return SHOWER_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function hasShowerDetailsData(
  details?: ShowerMeasurementDetails | null,
): boolean {
  if (!details) return false;
  if (details.shower_type) return true;
  return [
    details.overall_width_mm,
    details.overall_depth_mm,
    details.overall_height_mm,
  ].some((value) => value != null && value > 0);
}
