<?php

namespace App\Services\Excel\Structure;

class DimensionParser
{
    public function looksLikeDimensionText(?string $text): bool
    {
        if ($text === null || $text === '') {
            return false;
        }

        if (preg_match('/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i', $text)) {
            return true;
        }

        return (bool) preg_match('/^\d+(?:\.\d+)?$/', trim($text));
    }

    /**
     * @return array{width_mm: float|null, depth_mm: float|null}
     */
    public function parseDimensions(?string $description): array
    {
        if ($description === null) {
            return ['width_mm' => null, 'depth_mm' => null];
        }

        if (preg_match('/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i', $description, $matches)) {
            return [
                'width_mm' => (float) $matches[1],
                'depth_mm' => (float) $matches[2],
            ];
        }

        if (preg_match('/(\d+(?:\.\d+)?)\s*(?:width|mm)?$/i', $description, $matches)) {
            return [
                'width_mm' => (float) $matches[1],
                'depth_mm' => null,
            ];
        }

        return ['width_mm' => null, 'depth_mm' => null];
    }
}
