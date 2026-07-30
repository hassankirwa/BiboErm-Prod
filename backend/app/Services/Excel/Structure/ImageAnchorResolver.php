<?php

namespace App\Services\Excel\Structure;

use App\Services\Projects\WorkbookDrawingExtractor;

class ImageAnchorResolver
{
    public function __construct(
        protected WorkbookDrawingExtractor $drawings,
    ) {}

    /**
     * @param  array<int, array<string, mixed>>  $imagesByRow
     * @return array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}
     */
    public function resolve(
        int $excelRow,
        array $imagesByRow,
        bool $inheritWithinGroup = false,
        int $maxBackwardRows = 4,
    ): array {
        $media = $imagesByRow[$excelRow] ?? null;
        if (($media['status'] ?? null) === 'extracted') {
            return $media;
        }

        if (! $inheritWithinGroup) {
            return $this->drawings->emptyEmbeddedMedia('none_found');
        }

        for ($offset = 1; $offset <= $maxBackwardRows; $offset++) {
            $row = $excelRow - $offset;
            if ($row <= 0) {
                break;
            }

            $media = $imagesByRow[$row] ?? null;
            if (($media['status'] ?? null) === 'extracted') {
                return $media;
            }
        }

        return $this->drawings->emptyEmbeddedMedia('none_found');
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public function inheritGroupImages(array $items, callable $groupKey): array
    {
        $groupImages = [];

        foreach ($items as $item) {
            if (empty($item['image_url'])) {
                continue;
            }

            $groupImages[$groupKey($item)] = [
                'path' => $item['image_path'] ?? null,
                'url' => $item['image_url'],
            ];
        }

        foreach ($items as $index => $item) {
            if (! empty($item['image_url'])) {
                continue;
            }

            $key = $groupKey($item);
            if (! isset($groupImages[$key])) {
                continue;
            }

            $items[$index]['image_path'] = $groupImages[$key]['path'];
            $items[$index]['image_url'] = $groupImages[$key]['url'];
            $items[$index]['picture_status'] = 'inherited';
        }

        return $items;
    }
}
