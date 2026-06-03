<?php

namespace App\Support;

final class SiteAssessmentData
{
    /**
     * Whether operational site assessment data has been saved on the dedicated page.
     *
     * @param  array<string, mixed>|null  $assessment
     */
    public static function hasOperationalData(?array $assessment): bool
    {
        if ($assessment === null || $assessment === []) {
            return false;
        }

        $hasCounts = collect([
            $assessment['doors_count'] ?? null,
            $assessment['windows_count'] ?? null,
            $assessment['balconies_count'] ?? null,
            $assessment['bathrooms_count'] ?? null,
        ])->contains(fn ($value) => is_numeric($value) && (int) $value > 0);

        $hasItems = collect(['doors', 'windows', 'balconies', 'bathrooms'])
            ->contains(fn (string $field) => ! empty($assessment[$field]) && is_array($assessment[$field]));

        $hasNotes = trim((string) ($assessment['operational_notes'] ?? '')) !== ''
            || trim((string) ($assessment['access_constraints'] ?? '')) !== ''
            || trim((string) ($assessment['fabrication_concerns'] ?? '')) !== '';

        return $hasCounts || $hasItems || $hasNotes || self::hasImages($assessment);
    }

    /**
     * @param  array<string, mixed>  $assessment
     */
    public static function hasImages(array $assessment): bool
    {
        if (! empty($assessment['additional_images']) && is_array($assessment['additional_images'])) {
            return true;
        }

        foreach (['balconies', 'bathrooms'] as $field) {
            foreach ($assessment[$field] ?? [] as $item) {
                if (! empty($item['images']) && is_array($item['images'])) {
                    return true;
                }
            }
        }

        return false;
    }
}
