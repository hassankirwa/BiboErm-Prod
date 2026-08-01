"use client";

import { Button } from "@/components/ui/button";
import { BalconyTypePicker } from "@/components/measurements/balcony-type-picker";
import {
  BoolField,
  CheckboxGroupField,
  FieldGrid,
  MeasurementSection,
  NumberField,
  SelectField,
  TextField,
} from "@/components/measurements/measurement-detail-fields";
import {
  ANGLE_PRESET_OPTIONS,
  BALCONY_CORNER_TYPE_OPTIONS,
  BALCONY_GLASS_COLOUR_OPTIONS,
  BALCONY_GLASS_SYSTEM_OPTIONS,
  BALCONY_GLASS_TYPE_OPTIONS,
  BALCONY_HANDRAIL_OPTIONS,
  BALCONY_OBSTRUCTION_OPTIONS,
  BALCONY_SIDE_CONDITION_OPTIONS,
  emptyBalconyCurvedSection,
  emptyBalconyDetails,
  emptyBalconySide,
  type AnglePreset,
  type BalconyCornerType,
  type BalconyFrontEdgeShape,
  type BalconyGlassColour,
  type BalconyGlassSystem,
  type BalconyGlassType,
  type BalconyHandrail,
  type BalconyMeasurementDetails,
  type BalconyObstruction,
  type BalconySideCondition,
  type BalconySideMeasurements,
  type BalconyType,
} from "@/lib/measurements/balcony-types";
import { Plus, Trash2 } from "lucide-react";

type BalconyMeasurementPanelProps = {
  value?: BalconyMeasurementDetails | null;
  readOnly?: boolean;
  onChange: (value: BalconyMeasurementDetails) => void;
};

function ensureDetails(
  value?: BalconyMeasurementDetails | null,
): BalconyMeasurementDetails {
  return {
    ...emptyBalconyDetails(),
    ...value,
    left_side: { ...emptyBalconySide(), ...value?.left_side },
    right_side: { ...emptyBalconySide(), ...value?.right_side },
    front_edge: {
      total_length_mm: null,
      shape: null,
      curve_radius_mm: null,
      barricade_height_mm: null,
      open_height_above_barricade_mm: null,
      facet_1_length_mm: null,
      facet_2_length_mm: null,
      facet_3_length_mm: null,
      ...value?.front_edge,
    },
    curved_sections: value?.curved_sections ?? [],
    angles: value?.angles?.length
      ? value.angles
      : emptyBalconyDetails().angles,
    obstructions: value?.obstructions ?? [],
  };
}

function seedSidesForBalconyType(
  type: BalconyType,
  current: BalconyMeasurementDetails,
): Pick<BalconyMeasurementDetails, "left_side" | "right_side"> {
  const left = { ...emptyBalconySide(), ...current.left_side };
  const right = { ...emptyBalconySide(), ...current.right_side };

  if (type === "between_two_walls") {
    return {
      left_side: { ...left, condition: "full_wall" },
      right_side: { ...right, condition: "full_wall" },
    };
  }

  if (type === "edge") {
    // Default: left full wall, right open — user can swap.
    return {
      left_side: {
        ...left,
        condition: left.condition ?? "full_wall",
      },
      right_side: {
        ...right,
        condition: right.condition === "full_wall" ? "full_wall" : "open",
      },
    };
  }

  if (type === "floating") {
    return {
      left_side: { ...left, condition: "open" },
      right_side: { ...right, condition: "open" },
    };
  }

  if (type === "irregular") {
    return {
      left_side: { ...left, condition: left.condition ?? "open" },
      right_side: { ...right, condition: right.condition ?? "open" },
    };
  }

  if (type === "curved") {
    return {
      left_side: {
        ...left,
        condition: left.condition ?? "open",
      },
      right_side: {
        ...right,
        condition: right.condition ?? "open",
      },
    };
  }

  return { left_side: left, right_side: right };
}

function SideFields({
  title,
  side,
  readOnly,
  onChange,
}: {
  title: string;
  side: BalconySideMeasurements;
  readOnly?: boolean;
  onChange: (side: BalconySideMeasurements) => void;
}) {
  const condition = side.condition ?? null;

  return (
    <div className="min-w-0 space-y-2 rounded border border-dashed border-border p-2 sm:p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <FieldGrid>
        <SelectField
          label="Side condition"
          value={condition}
          options={BALCONY_SIDE_CONDITION_OPTIONS}
          readOnly={readOnly}
          onChange={(next) =>
            onChange({
              ...side,
              condition: next as BalconySideCondition | null,
            })
          }
        />
        {condition === "full_wall" && (
          <NumberField
            label="Full wall length (projection)"
            value={side.wall_length_mm}
            readOnly={readOnly}
            onChange={(wall_length_mm) => onChange({ ...side, wall_length_mm })}
          />
        )}
        {condition === "open" && (
          <>
            <NumberField
              label="Open edge length"
              value={side.open_edge_length_mm}
              readOnly={readOnly}
              onChange={(open_edge_length_mm) =>
                onChange({ ...side, open_edge_length_mm })
              }
            />
            <NumberField
              label="Barricade / parapet height"
              value={side.barricade_height_mm}
              readOnly={readOnly}
              onChange={(barricade_height_mm) =>
                onChange({ ...side, barricade_height_mm })
              }
            />
            <NumberField
              label="Open height above barricade"
              value={side.open_height_above_barricade_mm}
              readOnly={readOnly}
              onChange={(open_height_above_barricade_mm) =>
                onChange({ ...side, open_height_above_barricade_mm })
              }
            />
          </>
        )}
        <SelectField
          label="Angle"
          value={side.angle_preset}
          options={ANGLE_PRESET_OPTIONS}
          readOnly={readOnly}
          onChange={(angle_preset) =>
            onChange({ ...side, angle_preset: angle_preset as AnglePreset | null })
          }
        />
        {side.angle_preset === "custom" && (
          <NumberField
            label="Custom angle"
            value={side.angle_custom_degrees}
            readOnly={readOnly}
            unit="°"
            onChange={(angle_custom_degrees) =>
              onChange({ ...side, angle_custom_degrees })
            }
          />
        )}
        <SelectField
          label="Corner type"
          value={side.corner_type}
          options={BALCONY_CORNER_TYPE_OPTIONS}
          readOnly={readOnly}
          onChange={(corner_type) =>
            onChange({
              ...side,
              corner_type: corner_type as BalconyCornerType | null,
            })
          }
        />
      </FieldGrid>
      {condition === "open" && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Barricade is the low wall (e.g. 1/3, 1/2, or ~1400 mm). Open height is
          from the top of that barricade to the top of the balcony opening —
          that is the glass / railing area.
        </p>
      )}
      {condition === "full_wall" && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Full-height wall covers the entire balcony height on this side — not
          an open glass edge.
        </p>
      )}
    </div>
  );
}

export function BalconyMeasurementPanel({
  value,
  readOnly = false,
  onChange,
}: BalconyMeasurementPanelProps) {
  const details = ensureDetails(value);

  function patch(partial: Partial<BalconyMeasurementDetails>) {
    onChange({ ...details, ...partial });
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden bg-muted/20 p-2 sm:p-3">
      <BalconyTypePicker
        value={details.balcony_type}
        readOnly={readOnly}
        onChange={(balcony_type) => {
          if (!balcony_type) {
            patch({ balcony_type: null });
            return;
          }
          const seeded = seedSidesForBalconyType(balcony_type, details);
          patch({
            balcony_type,
            left_side: seeded.left_side,
            right_side: seeded.right_side,
            ...(balcony_type === "curved"
              ? {
                  front_edge: {
                    ...details.front_edge,
                    shape: "curved" as const,
                  },
                }
              : {}),
          });
        }}
      />

      <MeasurementSection title="Overall dimensions">
        <FieldGrid>
          <NumberField
            label="Overall width"
            value={details.overall_width_mm}
            readOnly={readOnly}
            onChange={(overall_width_mm) => patch({ overall_width_mm })}
          />
          <NumberField
            label="Overall projection (depth)"
            value={details.overall_projection_mm}
            readOnly={readOnly}
            onChange={(overall_projection_mm) =>
              patch({ overall_projection_mm })
            }
          />
          <NumberField
            label="FFL to top of slab"
            value={details.ffl_to_slab_mm}
            readOnly={readOnly}
            onChange={(ffl_to_slab_mm) => patch({ ffl_to_slab_mm })}
          />
          <NumberField
            label="Balcony height"
            value={details.balcony_height_mm}
            readOnly={readOnly}
            onChange={(balcony_height_mm) => patch({ balcony_height_mm })}
          />
        </FieldGrid>
      </MeasurementSection>

      <MeasurementSection title="Side measurements">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <SideFields
            title="Left side"
            side={details.left_side ?? emptyBalconySide()}
            readOnly={readOnly}
            onChange={(left_side) => patch({ left_side })}
          />
          <SideFields
            title="Right side"
            side={details.right_side ?? emptyBalconySide()}
            readOnly={readOnly}
            onChange={(right_side) => patch({ right_side })}
          />
          <div className="min-w-0 space-y-2 rounded border border-dashed border-border p-2 sm:p-3 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Front edge (open end, opposite the door)
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {details.balcony_type === "irregular"
                ? "Three equal front-facing edges. Record each edge length plus barricade and open height above."
                : details.balcony_type === "curved"
                  ? "Front edge is curved. Record arc / total length, curve radius, barricade height, and open height above the barricade."
                  : "Front is almost always open: low barricade plus open height above it (glass / railing zone). The door at the building face is not measured as a wall."}
            </p>
            <FieldGrid>
              {details.balcony_type === "irregular" ? (
                <>
                  <NumberField
                    label="Front edge 1 length"
                    value={details.front_edge?.facet_1_length_mm}
                    readOnly={readOnly}
                    onChange={(facet_1_length_mm) =>
                      patch({
                        front_edge: {
                          ...details.front_edge,
                          facet_1_length_mm,
                          shape: "straight",
                        },
                      })
                    }
                  />
                  <NumberField
                    label="Front edge 2 length"
                    value={details.front_edge?.facet_2_length_mm}
                    readOnly={readOnly}
                    onChange={(facet_2_length_mm) =>
                      patch({
                        front_edge: {
                          ...details.front_edge,
                          facet_2_length_mm,
                          shape: "straight",
                        },
                      })
                    }
                  />
                  <NumberField
                    label="Front edge 3 length"
                    value={details.front_edge?.facet_3_length_mm}
                    readOnly={readOnly}
                    onChange={(facet_3_length_mm) =>
                      patch({
                        front_edge: {
                          ...details.front_edge,
                          facet_3_length_mm,
                          shape: "straight",
                        },
                      })
                    }
                  />
                </>
              ) : (
                <NumberField
                  label={
                    details.balcony_type === "curved"
                      ? "Arc / total length"
                      : "Total length"
                  }
                  value={details.front_edge?.total_length_mm}
                  readOnly={readOnly}
                  onChange={(total_length_mm) =>
                    patch({
                      front_edge: {
                        ...details.front_edge,
                        total_length_mm,
                        ...(details.balcony_type === "curved"
                          ? { shape: "curved" as const }
                          : {}),
                      },
                    })
                  }
                />
              )}
              <NumberField
                label="Barricade / parapet height"
                value={details.front_edge?.barricade_height_mm}
                readOnly={readOnly}
                onChange={(barricade_height_mm) =>
                  patch({
                    front_edge: { ...details.front_edge, barricade_height_mm },
                  })
                }
              />
              <NumberField
                label="Open height above barricade"
                value={details.front_edge?.open_height_above_barricade_mm}
                readOnly={readOnly}
                onChange={(open_height_above_barricade_mm) =>
                  patch({
                    front_edge: {
                      ...details.front_edge,
                      open_height_above_barricade_mm,
                    },
                  })
                }
              />
              {details.balcony_type === "curved" ? (
                <NumberField
                  label="Curve radius"
                  value={details.front_edge?.curve_radius_mm}
                  readOnly={readOnly}
                  onChange={(curve_radius_mm) =>
                    patch({
                      front_edge: {
                        ...details.front_edge,
                        curve_radius_mm,
                        shape: "curved",
                      },
                    })
                  }
                />
              ) : details.balcony_type !== "irregular" ? (
                <SelectField
                  label="Straight or curved"
                  value={details.front_edge?.shape}
                  options={[
                    { value: "straight", label: "Straight" },
                    { value: "curved", label: "Curved" },
                  ]}
                  readOnly={readOnly}
                  onChange={(shape) =>
                    patch({
                      front_edge: {
                        ...details.front_edge,
                        shape: shape as BalconyFrontEdgeShape | null,
                      },
                    })
                  }
                />
              ) : null}
              {details.balcony_type !== "curved" &&
                details.balcony_type !== "irregular" &&
                details.front_edge?.shape === "curved" && (
                  <NumberField
                    label="Curve radius"
                    value={details.front_edge?.curve_radius_mm}
                    readOnly={readOnly}
                    onChange={(curve_radius_mm) =>
                      patch({
                        front_edge: { ...details.front_edge, curve_radius_mm },
                      })
                    }
                  />
                )}
            </FieldGrid>
          </div>
        </div>
      </MeasurementSection>

      <MeasurementSection title="Structural measurements">
        <FieldGrid>
          <NumberField
            label="Slab thickness"
            value={details.slab_thickness_mm}
            readOnly={readOnly}
            onChange={(slab_thickness_mm) => patch({ slab_thickness_mm })}
          />
          <NumberField
            label="Wall thickness"
            value={details.wall_thickness_mm}
            readOnly={readOnly}
            onChange={(wall_thickness_mm) => patch({ wall_thickness_mm })}
          />
          <NumberField
            label="Step height (FFL to balcony top)"
            value={details.step_height_mm}
            readOnly={readOnly}
            onChange={(step_height_mm) => patch({ step_height_mm })}
          />
          <NumberField
            label="Kerb / collar height"
            value={details.kerb_height_mm}
            readOnly={readOnly}
            onChange={(kerb_height_mm) => patch({ kerb_height_mm })}
          />
          <NumberField
            label="Kerb / collar width"
            value={details.kerb_width_mm}
            readOnly={readOnly}
            onChange={(kerb_width_mm) => patch({ kerb_width_mm })}
          />
          <NumberField
            label="Floor slope"
            value={details.floor_slope_mm}
            readOnly={readOnly}
            onChange={(floor_slope_mm) => patch({ floor_slope_mm })}
          />
          <TextField
            label="Drain position"
            value={details.drain_position}
            readOnly={readOnly}
            onChange={(drain_position) => patch({ drain_position })}
          />
          <NumberField
            label="Drain distance from left corner"
            value={details.drain_distance_from_left_mm}
            readOnly={readOnly}
            onChange={(drain_distance_from_left_mm) =>
              patch({ drain_distance_from_left_mm })
            }
          />
          <NumberField
            label="Drain distance from front edge"
            value={details.drain_distance_from_front_mm}
            readOnly={readOnly}
            onChange={(drain_distance_from_front_mm) =>
              patch({ drain_distance_from_front_mm })
            }
          />
        </FieldGrid>
      </MeasurementSection>

      <MeasurementSection title="Curved sections">
        <div className="space-y-3">
          {(details.curved_sections ?? []).map((section, index) => (
            <div
              key={index}
              className="space-y-2 rounded border border-dashed border-border p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Section {index + 1}</p>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      patch({
                        curved_sections: (details.curved_sections ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <FieldGrid>
                <NumberField
                  label="Radius"
                  value={section.radius_mm}
                  readOnly={readOnly}
                  onChange={(radius_mm) => {
                    const curved_sections = [...(details.curved_sections ?? [])];
                    curved_sections[index] = { ...section, radius_mm };
                    patch({ curved_sections });
                  }}
                />
                <NumberField
                  label="Diameter"
                  value={section.diameter_mm}
                  readOnly={readOnly}
                  onChange={(diameter_mm) => {
                    const curved_sections = [...(details.curved_sections ?? [])];
                    curved_sections[index] = { ...section, diameter_mm };
                    patch({ curved_sections });
                  }}
                />
                <NumberField
                  label="Arc length"
                  value={section.arc_length_mm}
                  readOnly={readOnly}
                  onChange={(arc_length_mm) => {
                    const curved_sections = [...(details.curved_sections ?? [])];
                    curved_sections[index] = { ...section, arc_length_mm };
                    patch({ curved_sections });
                  }}
                />
                <TextField
                  label="Start point"
                  value={section.start_point}
                  readOnly={readOnly}
                  onChange={(start_point) => {
                    const curved_sections = [...(details.curved_sections ?? [])];
                    curved_sections[index] = { ...section, start_point };
                    patch({ curved_sections });
                  }}
                />
                <TextField
                  label="End point"
                  value={section.end_point}
                  readOnly={readOnly}
                  onChange={(end_point) => {
                    const curved_sections = [...(details.curved_sections ?? [])];
                    curved_sections[index] = { ...section, end_point };
                    patch({ curved_sections });
                  }}
                />
              </FieldGrid>
            </div>
          ))}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patch({
                  curved_sections: [
                    ...(details.curved_sections ?? []),
                    emptyBalconyCurvedSection(),
                  ],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add curved section
            </Button>
          )}
        </div>
      </MeasurementSection>

      <MeasurementSection title="Angles">
        <div className="space-y-3">
          {(details.angles ?? []).map((angle, index) => (
            <FieldGrid key={`${angle.name}-${index}`}>
              <TextField
                label="Corner name"
                value={angle.name}
                readOnly={readOnly}
                onChange={(name) => {
                  const angles = [...(details.angles ?? [])];
                  angles[index] = { ...angle, name };
                  patch({ angles });
                }}
              />
              <SelectField
                label="Angle"
                value={angle.preset}
                options={ANGLE_PRESET_OPTIONS}
                readOnly={readOnly}
                onChange={(preset) => {
                  const angles = [...(details.angles ?? [])];
                  angles[index] = {
                    ...angle,
                    preset: preset as AnglePreset | null,
                  };
                  patch({ angles });
                }}
              />
              {angle.preset === "custom" && (
                <NumberField
                  label="Custom degrees"
                  value={angle.custom_degrees}
                  readOnly={readOnly}
                  unit="°"
                  onChange={(custom_degrees) => {
                    const angles = [...(details.angles ?? [])];
                    angles[index] = { ...angle, custom_degrees };
                    patch({ angles });
                  }}
                />
              )}
            </FieldGrid>
          ))}
        </div>
      </MeasurementSection>

      <MeasurementSection title="Existing conditions">
        <FieldGrid>
          <TextField
            label="Wall finish"
            value={details.wall_finish}
            readOnly={readOnly}
            onChange={(wall_finish) => patch({ wall_finish })}
          />
          <TextField
            label="Floor finish"
            value={details.floor_finish}
            readOnly={readOnly}
            onChange={(floor_finish) => patch({ floor_finish })}
          />
        </FieldGrid>
        <div className="mt-3 flex flex-wrap gap-4">
          <BoolField
            label="Waterproofing present"
            value={details.waterproofing_present}
            readOnly={readOnly}
            onChange={(waterproofing_present) =>
              patch({ waterproofing_present })
            }
          />
          <BoolField
            label="Expansion joint"
            value={details.expansion_joint}
            readOnly={readOnly}
            onChange={(expansion_joint) => patch({ expansion_joint })}
          />
        </div>
        <div className="mt-3 space-y-3">
          <CheckboxGroupField
            label="Obstructions"
            values={details.obstructions as BalconyObstruction[]}
            options={BALCONY_OBSTRUCTION_OPTIONS}
            readOnly={readOnly}
            onChange={(obstructions) => patch({ obstructions })}
          />
          {(details.obstructions ?? []).includes("other") && (
            <TextField
              label="Other obstruction"
              value={details.obstruction_other}
              readOnly={readOnly}
              onChange={(obstruction_other) => patch({ obstruction_other })}
            />
          )}
        </div>
      </MeasurementSection>

      <MeasurementSection title="Glass design specifications">
        <FieldGrid>
          <SelectField
            label="System"
            value={details.glass_system}
            options={BALCONY_GLASS_SYSTEM_OPTIONS}
            readOnly={readOnly}
            onChange={(glass_system) =>
              patch({
                glass_system: glass_system as BalconyGlassSystem | null,
              })
            }
          />
          {details.glass_system === "other" && (
            <TextField
              label="Other system"
              value={details.glass_system_other}
              readOnly={readOnly}
              onChange={(glass_system_other) => patch({ glass_system_other })}
            />
          )}
          <NumberField
            label="Glass thickness"
            value={details.glass_thickness_mm}
            readOnly={readOnly}
            onChange={(glass_thickness_mm) => patch({ glass_thickness_mm })}
          />
          <SelectField
            label="Glass type"
            value={details.glass_type}
            options={BALCONY_GLASS_TYPE_OPTIONS}
            readOnly={readOnly}
            onChange={(glass_type) =>
              patch({ glass_type: glass_type as BalconyGlassType | null })
            }
          />
          {details.glass_type === "other" && (
            <TextField
              label="Other glass type"
              value={details.glass_type_other}
              readOnly={readOnly}
              onChange={(glass_type_other) => patch({ glass_type_other })}
            />
          )}
          <SelectField
            label="Glass colour"
            value={details.glass_colour}
            options={BALCONY_GLASS_COLOUR_OPTIONS}
            readOnly={readOnly}
            onChange={(glass_colour) =>
              patch({
                glass_colour: glass_colour as BalconyGlassColour | null,
              })
            }
          />
          {details.glass_colour === "other" && (
            <TextField
              label="Other colour"
              value={details.glass_colour_other}
              readOnly={readOnly}
              onChange={(glass_colour_other) => patch({ glass_colour_other })}
            />
          )}
          <SelectField
            label="Handrail"
            value={details.handrail}
            options={BALCONY_HANDRAIL_OPTIONS}
            readOnly={readOnly}
            onChange={(handrail) =>
              patch({ handrail: handrail as BalconyHandrail | null })
            }
          />
          <TextField
            label="Accessories material"
            value={details.accessories_material}
            readOnly={readOnly}
            onChange={(accessories_material) =>
              patch({ accessories_material })
            }
          />
          <TextField
            label="Accessories finish"
            value={details.accessories_finish}
            readOnly={readOnly}
            onChange={(accessories_finish) => patch({ accessories_finish })}
          />
          <TextField
            label="Accessories colour"
            value={details.accessories_colour}
            readOnly={readOnly}
            onChange={(accessories_colour) => patch({ accessories_colour })}
          />
        </FieldGrid>
      </MeasurementSection>
    </div>
  );
}
