<?php

namespace App\Services\Excel\Structure;

use App\Enums\Warehouse\ItemCategory;
use Illuminate\Support\Str;

class MaterialClassifier
{
    public function __construct(
        protected DimensionParser $dimensions,
    ) {}

    public function classifyForCatalog(
        mixed $category,
        ?string $name,
        ?string $section,
        ?string $catalogTier,
        bool $inHardwareBlock,
        ?string $description,
        ?string $code,
        bool $hasProfileTableContext = false,
    ): string {
        $raw = mb_strtolower(trim((string) $category));
        if (in_array($raw, array_column(ItemCategory::cases(), 'value'), true)) {
            return $raw;
        }

        if ($catalogTier === 'balustrade') {
            return ItemCategory::Accessory->value;
        }

        $haystack = mb_strtolower(($name ?? '').' '.($section ?? ''));

        if (Str::contains($haystack, ['rubber', 'gasket', 'seal'])) {
            return ItemCategory::Rubber->value;
        }

        if ($code !== null && preg_match('/^(?:PY|WP|HL|WY|GC|DJ|TL|PC|FDQ|GL)-?\d/i', $code) && ! $inHardwareBlock) {
            return ItemCategory::AluminiumProfile->value;
        }

        if ($inHardwareBlock || str_contains(mb_strtoupper($section ?? ''), 'ACCESSORIES')) {
            return ItemCategory::Accessory->value;
        }

        if ($code !== null && $this->dimensions->looksLikeDimensionText($description ?? '')) {
            return ItemCategory::AluminiumProfile->value;
        }

        if ($hasProfileTableContext && $code !== null) {
            return ItemCategory::AluminiumProfile->value;
        }

        if (Str::contains($haystack, [
            'profile', 'series', 'frame', 'sash', 'rail', 'track', 'bead', 'louver', 'muntin',
        ])) {
            return ItemCategory::AluminiumProfile->value;
        }

        if ($name !== null && Str::contains(mb_strtolower($name), ['frame', 'sash', 'rail', 'track', 'bead', 'muntin', 'profile'])) {
            return ItemCategory::AluminiumProfile->value;
        }

        if ($description !== null && $this->dimensions->looksLikeDimensionText($description)) {
            return ItemCategory::AluminiumProfile->value;
        }

        return ItemCategory::Accessory->value;
    }

    public function defaultUnit(string $category): string
    {
        return match ($category) {
            ItemCategory::AluminiumProfile->value, ItemCategory::Rubber->value => 'metre',
            default => 'each',
        };
    }
}
