"use client";

import {
  BoolField,
  FieldGrid,
  MeasurementSection,
  NumberField,
  SelectField,
  TextField,
} from "@/components/measurements/measurement-detail-fields";
import { ShowerTypePicker } from "@/components/measurements/shower-type-picker";
import {
  ANGLE_PRESET_OPTIONS,
  type AnglePreset,
} from "@/lib/measurements/balcony-types";
import {
  emptyShowerDetails,
  emptyShowerWall,
  SHOWER_DESIGN_OPTIONS,
  SHOWER_GLASS_COLOUR_OPTIONS,
  SHOWER_GLASS_TYPE_OPTIONS,
  SHOWER_HARDWARE_FINISH_OPTIONS,
  SHOWER_SEAL_TYPE_OPTIONS,
  type ShowerDesign,
  type ShowerGlassColour,
  type ShowerGlassType,
  type ShowerHardwareFinish,
  type ShowerMeasurementDetails,
  type ShowerSealType,
  type ShowerWallMeasurements,
} from "@/lib/measurements/shower-types";

type ShowerMeasurementPanelProps = {
  value?: ShowerMeasurementDetails | null;
  readOnly?: boolean;
  onChange: (value: ShowerMeasurementDetails) => void;
};

function ensureDetails(
  value?: ShowerMeasurementDetails | null,
): ShowerMeasurementDetails {
  return {
    ...emptyShowerDetails(),
    ...value,
    left_wall: { ...emptyShowerWall(), ...value?.left_wall },
    right_wall: { ...emptyShowerWall(), ...value?.right_wall },
    back_wall: { ...emptyShowerWall(), ...value?.back_wall },
    angles: value?.angles?.length
      ? value.angles
      : emptyShowerDetails().angles,
  };
}

function WallFields({
  title,
  wall,
  readOnly,
  includePlumb = true,
  onChange,
}: {
  title: string;
  wall: ShowerWallMeasurements;
  readOnly?: boolean;
  includePlumb?: boolean;
  onChange: (wall: ShowerWallMeasurements) => void;
}) {
  return (
    <div className="space-y-2 rounded border border-dashed border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <FieldGrid>
        <NumberField
          label="Width"
          value={wall.width_mm}
          readOnly={readOnly}
          onChange={(width_mm) => onChange({ ...wall, width_mm })}
        />
        {includePlumb && (
          <NumberField
            label="Vertical plumb"
            value={wall.vertical_plumb_mm}
            readOnly={readOnly}
            onChange={(vertical_plumb_mm) =>
              onChange({ ...wall, vertical_plumb_mm })
            }
          />
        )}
        <SelectField
          label="Angle"
          value={wall.angle_preset}
          options={ANGLE_PRESET_OPTIONS}
          readOnly={readOnly}
          onChange={(angle_preset) =>
            onChange({
              ...wall,
              angle_preset: angle_preset as AnglePreset | null,
            })
          }
        />
        {wall.angle_preset === "custom" && (
          <NumberField
            label="Custom angle"
            value={wall.angle_custom_degrees}
            readOnly={readOnly}
            unit="°"
            onChange={(angle_custom_degrees) =>
              onChange({ ...wall, angle_custom_degrees })
            }
          />
        )}
      </FieldGrid>
    </div>
  );
}

export function ShowerMeasurementPanel({
  value,
  readOnly = false,
  onChange,
}: ShowerMeasurementPanelProps) {
  const details = ensureDetails(value);

  function patch(partial: Partial<ShowerMeasurementDetails>) {
    onChange({ ...details, ...partial });
  }

  return (
    <div className="space-y-4 bg-muted/20 p-2 sm:p-3">
      <ShowerTypePicker
        value={details.shower_type}
        readOnly={readOnly}
        onChange={(shower_type) => patch({ shower_type })}
      />

      <MeasurementSection title="Overall measurements">
        <FieldGrid>
          <NumberField
            label="Width"
            value={details.overall_width_mm}
            readOnly={readOnly}
            onChange={(overall_width_mm) => patch({ overall_width_mm })}
          />
          <NumberField
            label="Depth"
            value={details.overall_depth_mm}
            readOnly={readOnly}
            onChange={(overall_depth_mm) => patch({ overall_depth_mm })}
          />
          <NumberField
            label="Height"
            value={details.overall_height_mm}
            readOnly={readOnly}
            onChange={(overall_height_mm) => patch({ overall_height_mm })}
          />
          <NumberField
            label="Finished floor level"
            value={details.finished_floor_level_mm}
            readOnly={readOnly}
            onChange={(finished_floor_level_mm) =>
              patch({ finished_floor_level_mm })
            }
          />
          <NumberField
            label="Ceiling height"
            value={details.ceiling_height_mm}
            readOnly={readOnly}
            onChange={(ceiling_height_mm) => patch({ ceiling_height_mm })}
          />
        </FieldGrid>
      </MeasurementSection>

      <MeasurementSection title="Kerb / collar">
        <FieldGrid>
          <NumberField
            label="Height"
            value={details.kerb_height_mm}
            readOnly={readOnly}
            onChange={(kerb_height_mm) => patch({ kerb_height_mm })}
          />
          <NumberField
            label="Width"
            value={details.kerb_width_mm}
            readOnly={readOnly}
            onChange={(kerb_width_mm) => patch({ kerb_width_mm })}
          />
          <NumberField
            label="Thickness"
            value={details.kerb_thickness_mm}
            readOnly={readOnly}
            onChange={(kerb_thickness_mm) => patch({ kerb_thickness_mm })}
          />
        </FieldGrid>
      </MeasurementSection>

      <MeasurementSection title="Wall measurements">
        <div className="space-y-3">
          <WallFields
            title="Left wall"
            wall={details.left_wall ?? emptyShowerWall()}
            readOnly={readOnly}
            onChange={(left_wall) => patch({ left_wall })}
          />
          <WallFields
            title="Right wall"
            wall={details.right_wall ?? emptyShowerWall()}
            readOnly={readOnly}
            onChange={(right_wall) => patch({ right_wall })}
          />
          <WallFields
            title="Back wall"
            wall={details.back_wall ?? emptyShowerWall()}
            readOnly={readOnly}
            includePlumb={false}
            onChange={(back_wall) => patch({ back_wall })}
          />
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

      <MeasurementSection title="Plumbing measurements">
        <FieldGrid>
          <NumberField
            label="Drain centre from left wall"
            value={details.drain_centre_from_left_mm}
            readOnly={readOnly}
            onChange={(drain_centre_from_left_mm) =>
              patch({ drain_centre_from_left_mm })
            }
          />
          <NumberField
            label="Drain centre from back wall"
            value={details.drain_centre_from_back_mm}
            readOnly={readOnly}
            onChange={(drain_centre_from_back_mm) =>
              patch({ drain_centre_from_back_mm })
            }
          />
          <NumberField
            label="Drain diameter"
            value={details.drain_diameter_mm}
            readOnly={readOnly}
            onChange={(drain_diameter_mm) => patch({ drain_diameter_mm })}
          />
          <NumberField
            label="Shower head height"
            value={details.shower_head_height_mm}
            readOnly={readOnly}
            onChange={(shower_head_height_mm) =>
              patch({ shower_head_height_mm })
            }
          />
          <NumberField
            label="Shower arm projection"
            value={details.shower_arm_projection_mm}
            readOnly={readOnly}
            onChange={(shower_arm_projection_mm) =>
              patch({ shower_arm_projection_mm })
            }
          />
          <NumberField
            label="Mixer height"
            value={details.mixer_height_mm}
            readOnly={readOnly}
            onChange={(mixer_height_mm) => patch({ mixer_height_mm })}
          />
          <TextField
            label="Niche position"
            value={details.niche_position}
            readOnly={readOnly}
            onChange={(niche_position) => patch({ niche_position })}
          />
          <NumberField
            label="Toilet clearance"
            value={details.toilet_clearance_mm}
            readOnly={readOnly}
            onChange={(toilet_clearance_mm) => patch({ toilet_clearance_mm })}
          />
          <NumberField
            label="Toilet projection"
            value={details.toilet_projection_mm}
            readOnly={readOnly}
            onChange={(toilet_projection_mm) =>
              patch({ toilet_projection_mm })
            }
          />
          <NumberField
            label="Vanity clearance"
            value={details.vanity_clearance_mm}
            readOnly={readOnly}
            onChange={(vanity_clearance_mm) => patch({ vanity_clearance_mm })}
          />
        </FieldGrid>
      </MeasurementSection>

      <MeasurementSection title="Existing conditions">
        <div className="flex flex-wrap gap-4">
          <BoolField
            label="Wall tiles installed"
            value={details.wall_tiles_installed}
            readOnly={readOnly}
            onChange={(wall_tiles_installed) =>
              patch({ wall_tiles_installed })
            }
          />
          <BoolField
            label="Floor tiles installed"
            value={details.floor_tiles_installed}
            readOnly={readOnly}
            onChange={(floor_tiles_installed) =>
              patch({ floor_tiles_installed })
            }
          />
          <BoolField
            label="Waterproofing completed"
            value={details.waterproofing_completed}
            readOnly={readOnly}
            onChange={(waterproofing_completed) =>
              patch({ waterproofing_completed })
            }
          />
          <BoolField
            label="Ceiling finished"
            value={details.ceiling_finished}
            readOnly={readOnly}
            onChange={(ceiling_finished) => patch({ ceiling_finished })}
          />
          <BoolField
            label="Out-of-plumb walls"
            value={details.out_of_plumb_walls}
            readOnly={readOnly}
            onChange={(out_of_plumb_walls) => patch({ out_of_plumb_walls })}
          />
        </div>
        <div className="mt-3">
          <TextField
            label="Obstructions"
            value={details.obstructions}
            readOnly={readOnly}
            multiline
            onChange={(obstructions) => patch({ obstructions })}
          />
        </div>
      </MeasurementSection>

      <MeasurementSection title="Shower design specifications">
        <FieldGrid>
          <SelectField
            label="Design"
            value={details.design}
            options={SHOWER_DESIGN_OPTIONS}
            readOnly={readOnly}
            onChange={(design) =>
              patch({ design: design as ShowerDesign | null })
            }
          />
          <NumberField
            label="Glass thickness"
            value={details.glass_thickness_mm}
            readOnly={readOnly}
            onChange={(glass_thickness_mm) => patch({ glass_thickness_mm })}
          />
          <SelectField
            label="Glass type"
            value={details.glass_type}
            options={SHOWER_GLASS_TYPE_OPTIONS}
            readOnly={readOnly}
            onChange={(glass_type) =>
              patch({ glass_type: glass_type as ShowerGlassType | null })
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
            options={SHOWER_GLASS_COLOUR_OPTIONS}
            readOnly={readOnly}
            onChange={(glass_colour) =>
              patch({
                glass_colour: glass_colour as ShowerGlassColour | null,
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
            label="Hardware finish"
            value={details.hardware_finish}
            options={SHOWER_HARDWARE_FINISH_OPTIONS}
            readOnly={readOnly}
            onChange={(hardware_finish) =>
              patch({
                hardware_finish: hardware_finish as ShowerHardwareFinish | null,
              })
            }
          />
          {details.hardware_finish === "custom" && (
            <TextField
              label="Custom hardware finish"
              value={details.hardware_finish_custom}
              readOnly={readOnly}
              onChange={(hardware_finish_custom) =>
                patch({ hardware_finish_custom })
              }
            />
          )}
          <SelectField
            label="Seal type"
            value={details.seal_type}
            options={SHOWER_SEAL_TYPE_OPTIONS}
            readOnly={readOnly}
            onChange={(seal_type) =>
              patch({ seal_type: seal_type as ShowerSealType | null })
            }
          />
        </FieldGrid>
        <div className="mt-3 flex flex-wrap gap-4">
          <BoolField
            label="Hinges"
            value={details.hardware_hinges}
            readOnly={readOnly}
            onChange={(hardware_hinges) => patch({ hardware_hinges })}
          />
          <BoolField
            label="Handles"
            value={details.hardware_handles}
            readOnly={readOnly}
            onChange={(hardware_handles) => patch({ hardware_handles })}
          />
          <BoolField
            label="Rollers"
            value={details.hardware_rollers}
            readOnly={readOnly}
            onChange={(hardware_rollers) => patch({ hardware_rollers })}
          />
          <BoolField
            label="Stabilizer bar"
            value={details.hardware_stabilizer_bar}
            readOnly={readOnly}
            onChange={(hardware_stabilizer_bar) =>
              patch({ hardware_stabilizer_bar })
            }
          />
          <BoolField
            label="U-Channel"
            value={details.hardware_u_channel}
            readOnly={readOnly}
            onChange={(hardware_u_channel) => patch({ hardware_u_channel })}
          />
        </div>
      </MeasurementSection>
    </div>
  );
}
