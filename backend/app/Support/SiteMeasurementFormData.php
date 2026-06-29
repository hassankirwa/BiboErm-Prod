<?php

namespace App\Support;

final class SiteMeasurementFormData
{
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
