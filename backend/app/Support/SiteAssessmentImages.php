<?php

namespace App\Support;

final class SiteAssessmentImages
{
    /**
     * @param  array<string, mixed>  $assessment
     * @return array<string, mixed>
     */
    public static function enrichUrls(array $assessment): array
    {
        if (isset($assessment['additional_images']) && is_array($assessment['additional_images'])) {
            $assessment['additional_images'] = self::enrichList($assessment['additional_images']);
        }

        foreach (['balconies', 'bathrooms'] as $field) {
            if (! isset($assessment[$field]) || ! is_array($assessment[$field])) {
                continue;
            }

            $assessment[$field] = array_map(function (array $item): array {
                if (isset($item['images']) && is_array($item['images'])) {
                    $item['images'] = self::enrichList($item['images']);
                }

                return $item;
            }, $assessment[$field]);
        }

        return $assessment;
    }

    /**
     * @param  list<array<string, mixed>>  $images
     * @return list<array<string, mixed>>
     */
    public static function enrichList(array $images): array
    {
        return array_values(array_map(
            fn (array $image): array => self::enrichOne($image),
            $images,
        ));
    }

    /**
     * @param  array<string, mixed>  $image
     * @return array<string, mixed>
     */
    public static function enrichOne(array $image): array
    {
        $path = ltrim(str_replace('\\', '/', (string) ($image['path'] ?? '')), '/');

        if ($path !== '') {
            $image['url'] = BiboStorage::resolveStoredUrl($path);
        }

        return $image;
    }
}
