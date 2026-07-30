<?php

namespace App\Support;

final class SiteMeasurementFormData
{
    private const BALCONY_TYPES = [
        'between_two_walls', 'edge', 'floating', 'l_shaped', 'u_shaped', 'curved', 'irregular',
    ];

    private const SHOWER_TYPES = [
        'straight', 'corner_l', 'u_shape', 'neo_angle', 'walk_in', 'bathtub_screen', 'custom',
    ];

    private const ANGLE_PRESETS = ['90', '135', '180', 'custom'];

    private const CORNER_TYPES = ['square', 'chamfered', 'curved'];

    private const FRONT_EDGE_SHAPES = ['straight', 'curved'];

    private const BALCONY_OBSTRUCTIONS = [
        'ac_unit', 'downpipe', 'light', 'socket', 'column', 'beam', 'other',
    ];

    private const BALCONY_GLASS_SYSTEMS = [
        'post_system', 'u_channel', 'base_shoe', 'spigot', 'standoff', 'frameless', 'other',
    ];

    private const BALCONY_GLASS_TYPES = [
        'toughened', 'laminated', 'toughened_laminated', 'other',
    ];

    private const BALCONY_GLASS_COLOURS = [
        'clear', 'ultra_clear', 'grey', 'bronze', 'frosted', 'other',
    ];

    private const BALCONY_HANDRAILS = [
        'none', 'round', 'square', 'slotted', 'timber', 'stainless_steel',
    ];

    private const SHOWER_DESIGNS = [
        'sliding', 'swing', 'pivot', 'bi_fold', 'fixed_screen', 'walk_in', 'custom',
    ];

    private const SHOWER_HARDWARE_FINISHES = [
        'black', 'brushed_gold', 'chrome', 'brushed_nickel', 'satin', 'white', 'custom',
    ];

    private const SHOWER_SEAL_TYPES = [
        'magnetic', 'pvc', 'silicone', 'water_deflector',
    ];

    /**
     * @param  array<string, mixed>|null  $form
     */
    public static function hasOperationalData(?array $form): bool
    {
        if ($form === null || $form === []) {
            return false;
        }

        $lines = $form['lines'] ?? [];
        if (! is_array($lines)) {
            return false;
        }

        foreach ($lines as $line) {
            if (! is_array($line)) {
                continue;
            }

            if (self::lineHasMeasurableData($line)) {
                return true;
            }
        }

        return trim((string) ($form['operational_notes'] ?? '')) !== '';
    }

    /**
     * @param  array<string, mixed>  $line
     */
    public static function lineHasMeasurableData(array $line): bool
    {
        if (trim((string) ($line['ref'] ?? '')) !== ''
            || trim((string) ($line['room_location'] ?? '')) !== ''
            || trim((string) ($line['product_type'] ?? '')) !== '') {
            return true;
        }

        foreach ([
            'width_top_mm', 'width_centre_mm', 'width_bottom_mm',
            'height_left_mm', 'height_centre_mm', 'height_right_mm',
            'wall_height_mm', 'wall_thickness_mm',
        ] as $field) {
            if (isset($line[$field]) && is_numeric($line[$field]) && (float) $line[$field] > 0) {
                return true;
            }
        }

        if (self::balconyDetailsHaveData($line['balcony_details'] ?? null)) {
            return true;
        }

        if (self::showerDetailsHaveData($line['shower_details'] ?? null)) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function normalize(array $payload): array
    {
        $lines = [];
        foreach ($payload['lines'] ?? [] as $index => $line) {
            if (! is_array($line)) {
                continue;
            }

            $lines[] = [
                'ref' => self::nullableString($line['ref'] ?? null),
                'unit_floor' => self::nullableString($line['unit_floor'] ?? null),
                'room_location' => self::nullableString($line['room_location'] ?? null),
                'product_type' => self::nullableString($line['product_type'] ?? null),
                'quantity' => max(1, (int) ($line['quantity'] ?? 1)),
                'width_top_mm' => self::nullableNumeric($line['width_top_mm'] ?? null),
                'width_centre_mm' => self::nullableNumeric($line['width_centre_mm'] ?? null),
                'width_bottom_mm' => self::nullableNumeric($line['width_bottom_mm'] ?? null),
                'height_left_mm' => self::nullableNumeric($line['height_left_mm'] ?? null),
                'height_centre_mm' => self::nullableNumeric($line['height_centre_mm'] ?? null),
                'height_right_mm' => self::nullableNumeric($line['height_right_mm'] ?? null),
                'wall_height_mm' => self::nullableNumeric($line['wall_height_mm'] ?? null),
                'wall_thickness_mm' => self::nullableNumeric($line['wall_thickness_mm'] ?? null),
                'photo_refs' => self::normalizePhotoRefs($line['photo_refs'] ?? []),
                'remarks' => self::nullableString($line['remarks'] ?? null),
                'sort_order' => (int) ($line['sort_order'] ?? $index),
                'balcony_details' => self::normalizeBalconyDetails($line['balcony_details'] ?? null),
                'shower_details' => self::normalizeShowerDetails($line['shower_details'] ?? null),
            ];
        }

        return [
            'client_name' => self::nullableString($payload['client_name'] ?? null),
            'project_name' => self::nullableString($payload['project_name'] ?? null),
            'measured_at' => self::nullableString($payload['measured_at'] ?? null),
            'project_address' => self::nullableString($payload['project_address'] ?? null),
            'client_contact' => self::nullableString($payload['client_contact'] ?? null),
            'phone' => self::nullableString($payload['phone'] ?? null),
            'site_rep' => self::nullableString($payload['site_rep'] ?? null),
            'architect_designer' => self::nullableString($payload['architect_designer'] ?? null),
            'main_contractor' => self::nullableString($payload['main_contractor'] ?? null),
            'measured_by' => self::nullableString($payload['measured_by'] ?? null),
            'aluminium_series' => self::nullableString($payload['aluminium_series'] ?? null),
            'aluminium_colour' => self::nullableString($payload['aluminium_colour'] ?? null),
            'glass_type' => self::nullableString($payload['glass_type'] ?? null),
            'mesh_required' => (bool) ($payload['mesh_required'] ?? false),
            'grill_required' => (bool) ($payload['grill_required'] ?? false),
            'floor_finish' => self::nullableString($payload['floor_finish'] ?? null),
            'floor_finish_other' => self::nullableString($payload['floor_finish_other'] ?? null),
            'floor_finish_thickness_mm' => self::nullableNumeric($payload['floor_finish_thickness_mm'] ?? null),
            'site_status' => self::normalizeSiteStatus($payload['site_status'] ?? []),
            'lines' => $lines,
            'operational_notes' => self::nullableString($payload['operational_notes'] ?? null),
        ];
    }

    /**
     * @param  mixed  $value
     * @return array<string, mixed>|null
     */
    private static function normalizeBalconyDetails(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        $curvedSections = [];
        foreach ($value['curved_sections'] ?? [] as $section) {
            if (! is_array($section)) {
                continue;
            }
            $curvedSections[] = [
                'radius_mm' => self::nullableNumeric($section['radius_mm'] ?? null),
                'diameter_mm' => self::nullableNumeric($section['diameter_mm'] ?? null),
                'arc_length_mm' => self::nullableNumeric($section['arc_length_mm'] ?? null),
                'start_point' => self::nullableString($section['start_point'] ?? null),
                'end_point' => self::nullableString($section['end_point'] ?? null),
            ];
        }

        return [
            'balcony_type' => self::nullableEnum($value['balcony_type'] ?? null, self::BALCONY_TYPES),
            'overall_width_mm' => self::nullableNumeric($value['overall_width_mm'] ?? null),
            'overall_projection_mm' => self::nullableNumeric($value['overall_projection_mm'] ?? null),
            'ffl_to_slab_mm' => self::nullableNumeric($value['ffl_to_slab_mm'] ?? null),
            'balcony_height_mm' => self::nullableNumeric($value['balcony_height_mm'] ?? null),
            'left_side' => self::normalizeBalconySide($value['left_side'] ?? null),
            'right_side' => self::normalizeBalconySide($value['right_side'] ?? null),
            'front_edge' => self::normalizeBalconyFrontEdge($value['front_edge'] ?? null),
            'slab_thickness_mm' => self::nullableNumeric($value['slab_thickness_mm'] ?? null),
            'wall_thickness_mm' => self::nullableNumeric($value['wall_thickness_mm'] ?? null),
            'step_height_mm' => self::nullableNumeric($value['step_height_mm'] ?? null),
            'kerb_height_mm' => self::nullableNumeric($value['kerb_height_mm'] ?? null),
            'kerb_width_mm' => self::nullableNumeric($value['kerb_width_mm'] ?? null),
            'floor_slope_mm' => self::nullableNumeric($value['floor_slope_mm'] ?? null),
            'drain_position' => self::nullableString($value['drain_position'] ?? null),
            'drain_distance_from_left_mm' => self::nullableNumeric($value['drain_distance_from_left_mm'] ?? null),
            'drain_distance_from_front_mm' => self::nullableNumeric($value['drain_distance_from_front_mm'] ?? null),
            'curved_sections' => $curvedSections,
            'angles' => self::normalizeAngles($value['angles'] ?? []),
            'wall_finish' => self::nullableString($value['wall_finish'] ?? null),
            'floor_finish' => self::nullableString($value['floor_finish'] ?? null),
            'waterproofing_present' => self::nullableBool($value['waterproofing_present'] ?? null),
            'expansion_joint' => self::nullableBool($value['expansion_joint'] ?? null),
            'obstructions' => self::normalizeStringList($value['obstructions'] ?? [], self::BALCONY_OBSTRUCTIONS),
            'obstruction_other' => self::nullableString($value['obstruction_other'] ?? null),
            'glass_system' => self::nullableEnum($value['glass_system'] ?? null, self::BALCONY_GLASS_SYSTEMS),
            'glass_system_other' => self::nullableString($value['glass_system_other'] ?? null),
            'glass_thickness_mm' => self::nullableNumeric($value['glass_thickness_mm'] ?? null),
            'glass_type' => self::nullableEnum($value['glass_type'] ?? null, self::BALCONY_GLASS_TYPES),
            'glass_type_other' => self::nullableString($value['glass_type_other'] ?? null),
            'glass_colour' => self::nullableEnum($value['glass_colour'] ?? null, self::BALCONY_GLASS_COLOURS),
            'glass_colour_other' => self::nullableString($value['glass_colour_other'] ?? null),
            'handrail' => self::nullableEnum($value['handrail'] ?? null, self::BALCONY_HANDRAILS),
            'accessories_material' => self::nullableString($value['accessories_material'] ?? null),
            'accessories_finish' => self::nullableString($value['accessories_finish'] ?? null),
            'accessories_colour' => self::nullableString($value['accessories_colour'] ?? null),
        ];
    }

    /**
     * @param  mixed  $value
     * @return array<string, mixed>|null
     */
    private static function normalizeShowerDetails(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        return [
            'shower_type' => self::nullableEnum($value['shower_type'] ?? null, self::SHOWER_TYPES),
            'overall_width_mm' => self::nullableNumeric($value['overall_width_mm'] ?? null),
            'overall_depth_mm' => self::nullableNumeric($value['overall_depth_mm'] ?? null),
            'overall_height_mm' => self::nullableNumeric($value['overall_height_mm'] ?? null),
            'finished_floor_level_mm' => self::nullableNumeric($value['finished_floor_level_mm'] ?? null),
            'ceiling_height_mm' => self::nullableNumeric($value['ceiling_height_mm'] ?? null),
            'kerb_height_mm' => self::nullableNumeric($value['kerb_height_mm'] ?? null),
            'kerb_width_mm' => self::nullableNumeric($value['kerb_width_mm'] ?? null),
            'kerb_thickness_mm' => self::nullableNumeric($value['kerb_thickness_mm'] ?? null),
            'left_wall' => self::normalizeShowerWall($value['left_wall'] ?? null),
            'right_wall' => self::normalizeShowerWall($value['right_wall'] ?? null),
            'back_wall' => self::normalizeShowerWall($value['back_wall'] ?? null),
            'angles' => self::normalizeAngles($value['angles'] ?? []),
            'drain_centre_from_left_mm' => self::nullableNumeric($value['drain_centre_from_left_mm'] ?? null),
            'drain_centre_from_back_mm' => self::nullableNumeric($value['drain_centre_from_back_mm'] ?? null),
            'drain_diameter_mm' => self::nullableNumeric($value['drain_diameter_mm'] ?? null),
            'shower_head_height_mm' => self::nullableNumeric($value['shower_head_height_mm'] ?? null),
            'shower_arm_projection_mm' => self::nullableNumeric($value['shower_arm_projection_mm'] ?? null),
            'mixer_height_mm' => self::nullableNumeric($value['mixer_height_mm'] ?? null),
            'niche_position' => self::nullableString($value['niche_position'] ?? null),
            'toilet_clearance_mm' => self::nullableNumeric($value['toilet_clearance_mm'] ?? null),
            'toilet_projection_mm' => self::nullableNumeric($value['toilet_projection_mm'] ?? null),
            'vanity_clearance_mm' => self::nullableNumeric($value['vanity_clearance_mm'] ?? null),
            'wall_tiles_installed' => self::nullableBool($value['wall_tiles_installed'] ?? null),
            'floor_tiles_installed' => self::nullableBool($value['floor_tiles_installed'] ?? null),
            'waterproofing_completed' => self::nullableBool($value['waterproofing_completed'] ?? null),
            'ceiling_finished' => self::nullableBool($value['ceiling_finished'] ?? null),
            'out_of_plumb_walls' => self::nullableBool($value['out_of_plumb_walls'] ?? null),
            'obstructions' => self::nullableString($value['obstructions'] ?? null),
            'design' => self::nullableEnum($value['design'] ?? null, self::SHOWER_DESIGNS),
            'glass_thickness_mm' => self::nullableNumeric($value['glass_thickness_mm'] ?? null),
            'glass_type' => self::nullableEnum($value['glass_type'] ?? null, self::BALCONY_GLASS_TYPES),
            'glass_type_other' => self::nullableString($value['glass_type_other'] ?? null),
            'glass_colour' => self::nullableEnum($value['glass_colour'] ?? null, self::BALCONY_GLASS_COLOURS),
            'glass_colour_other' => self::nullableString($value['glass_colour_other'] ?? null),
            'hardware_hinges' => self::nullableBool($value['hardware_hinges'] ?? null),
            'hardware_handles' => self::nullableBool($value['hardware_handles'] ?? null),
            'hardware_rollers' => self::nullableBool($value['hardware_rollers'] ?? null),
            'hardware_stabilizer_bar' => self::nullableBool($value['hardware_stabilizer_bar'] ?? null),
            'hardware_u_channel' => self::nullableBool($value['hardware_u_channel'] ?? null),
            'hardware_finish' => self::nullableEnum($value['hardware_finish'] ?? null, self::SHOWER_HARDWARE_FINISHES),
            'hardware_finish_custom' => self::nullableString($value['hardware_finish_custom'] ?? null),
            'seal_type' => self::nullableEnum($value['seal_type'] ?? null, self::SHOWER_SEAL_TYPES),
        ];
    }

    /**
     * @param  mixed  $value
     * @return array<string, mixed>|null
     */
    private static function normalizeBalconySide(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        return [
            'wall_length_mm' => self::nullableNumeric($value['wall_length_mm'] ?? null),
            'open_edge_length_mm' => self::nullableNumeric($value['open_edge_length_mm'] ?? null),
            'condition' => self::nullableEnum($value['condition'] ?? null, ['full_wall', 'open']),
            'barricade_height_mm' => self::nullableNumeric($value['barricade_height_mm'] ?? null),
            'open_height_above_barricade_mm' => self::nullableNumeric($value['open_height_above_barricade_mm'] ?? null),
            'angle_preset' => self::nullableEnum($value['angle_preset'] ?? null, self::ANGLE_PRESETS),
            'angle_custom_degrees' => self::nullableNumeric($value['angle_custom_degrees'] ?? null),
            'corner_type' => self::nullableEnum($value['corner_type'] ?? null, self::CORNER_TYPES),
        ];
    }

    /**
     * @param  mixed  $value
     * @return array<string, mixed>|null
     */
    private static function normalizeBalconyFrontEdge(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        return [
            'total_length_mm' => self::nullableNumeric($value['total_length_mm'] ?? null),
            'shape' => self::nullableEnum($value['shape'] ?? null, self::FRONT_EDGE_SHAPES),
            'curve_radius_mm' => self::nullableNumeric($value['curve_radius_mm'] ?? null),
            'barricade_height_mm' => self::nullableNumeric($value['barricade_height_mm'] ?? null),
            'open_height_above_barricade_mm' => self::nullableNumeric($value['open_height_above_barricade_mm'] ?? null),
            'facet_1_length_mm' => self::nullableNumeric($value['facet_1_length_mm'] ?? null),
            'facet_2_length_mm' => self::nullableNumeric($value['facet_2_length_mm'] ?? null),
            'facet_3_length_mm' => self::nullableNumeric($value['facet_3_length_mm'] ?? null),
        ];
    }

    /**
     * @param  mixed  $value
     * @return array<string, mixed>|null
     */
    private static function normalizeShowerWall(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        return [
            'width_mm' => self::nullableNumeric($value['width_mm'] ?? null),
            'vertical_plumb_mm' => self::nullableNumeric($value['vertical_plumb_mm'] ?? null),
            'angle_preset' => self::nullableEnum($value['angle_preset'] ?? null, self::ANGLE_PRESETS),
            'angle_custom_degrees' => self::nullableNumeric($value['angle_custom_degrees'] ?? null),
        ];
    }

    /**
     * @param  mixed  $value
     * @return list<array{name: ?string, preset: ?string, custom_degrees: ?float}>
     */
    private static function normalizeAngles(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $angles = [];
        foreach ($value as $angle) {
            if (! is_array($angle)) {
                continue;
            }
            $angles[] = [
                'name' => self::nullableString($angle['name'] ?? null),
                'preset' => self::nullableEnum($angle['preset'] ?? null, self::ANGLE_PRESETS),
                'custom_degrees' => self::nullableNumeric($angle['custom_degrees'] ?? null),
            ];
        }

        return $angles;
    }

    /**
     * @param  mixed  $value
     */
    private static function balconyDetailsHaveData(mixed $value): bool
    {
        if (! is_array($value)) {
            return false;
        }

        if (trim((string) ($value['balcony_type'] ?? '')) !== '') {
            return true;
        }

        foreach (['overall_width_mm', 'overall_projection_mm', 'ffl_to_slab_mm', 'balcony_height_mm'] as $field) {
            if (isset($value[$field]) && is_numeric($value[$field]) && (float) $value[$field] > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  mixed  $value
     */
    private static function showerDetailsHaveData(mixed $value): bool
    {
        if (! is_array($value)) {
            return false;
        }

        if (trim((string) ($value['shower_type'] ?? '')) !== '') {
            return true;
        }

        foreach (['overall_width_mm', 'overall_depth_mm', 'overall_height_mm'] as $field) {
            if (isset($value[$field]) && is_numeric($value[$field]) && (float) $value[$field] > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  mixed  $value
     */
    private static function nullableString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @param  mixed  $value
     */
    private static function nullableNumeric($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        return round((float) $value, 2);
    }

    /**
     * @param  mixed  $value
     */
    private static function nullableBool(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (bool) $value;
    }

    /**
     * @param  mixed  $value
     * @param  list<string>  $allowed
     */
    private static function nullableEnum(mixed $value, array $allowed): ?string
    {
        $string = self::nullableString($value);
        if ($string === null) {
            return null;
        }

        return in_array($string, $allowed, true) ? $string : null;
    }

    /**
     * @param  mixed  $value
     * @param  list<string>  $allowed
     * @return list<string>
     */
    private static function normalizeStringList(mixed $value, array $allowed): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(
            array_map('strval', $value),
            fn (string $item) => in_array($item, $allowed, true),
        ));
    }

    /**
     * @param  mixed  $value
     * @return list<string>
     */
    private static function normalizeSiteStatus($value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $allowed = ['masonry', 'plastered', 'screeded', 'tiled', 'painted', 'occupied'];

        return array_values(array_filter(
            array_map('strval', $value),
            fn (string $item) => in_array($item, $allowed, true),
        ));
    }

    /**
     * @param  mixed  $value
     * @return list<int>
     */
    private static function normalizePhotoRefs($value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(
            array_map(fn ($id) => (int) $id, $value),
            fn (int $id) => $id > 0,
        ));
    }
}
