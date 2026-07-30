<?php

namespace App\Services\Warehouse\MasterData;

use App\Models\Warehouse\Bin;
use App\Models\Warehouse\BinCatalogCode;
use App\Support\BiboStorage;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class MaterialBinMapper
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public function mapItems(array $items): array
    {
        $catalogRows = BinCatalogCode::query()
            ->with('bin.section')
            ->get();

        return array_map(
            fn (array $item) => array_merge($item, $this->mapOne($item, $catalogRows)),
            $items,
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function availableBins(): array
    {
        $sectionCodes = array_values(BinCatalogExcelService::FILE_TO_SECTION);

        return Bin::query()
            ->with('section.deck')
            ->whereHas('section', fn ($query) => $query->whereIn('code', $sectionCodes))
            ->orderBy('section_id')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Bin $bin) => [
                'id' => $bin->id,
                'code' => $bin->code,
                'name' => $bin->name,
                'section_code' => $bin->section?->code,
                'section_name' => $bin->section?->name,
                'deck_slug' => $bin->section?->deck?->slug?->value ?? $bin->section?->deck?->slug,
                'label' => trim(($bin->section?->name ?? $bin->section?->code).' / '.$bin->code),
            ])
            ->all();
    }

    /**
     * @param  Collection<int, BinCatalogCode>  $catalogRows
     * @return array<string, mixed>
     */
    protected function mapOne(array $item, Collection $catalogRows): array
    {
        $code = trim((string) ($item['code'] ?? ''));
        $normalizedCode = $this->normalizeCode($code);
        $exact = $catalogRows->first(
            fn (BinCatalogCode $row) => $row->normalized_code === $normalizedCode
        );

        if ($exact) {
            return $this->mappingPayload($exact, 'exact_code', 1.0);
        }

        $descriptionTokens = $this->tokens((string) ($item['description'] ?? ''));
        if (count($descriptionTokens) < 2) {
            return $this->unmappedPayload();
        }

        $best = null;
        $bestScore = 0.0;

        foreach ($catalogRows as $row) {
            $name = trim((string) $row->source_name);
            if ($name === '') {
                continue;
            }

            $nameTokens = $this->tokens($name);
            if (count($nameTokens) < 2) {
                continue;
            }

            $intersection = count(array_intersect($descriptionTokens, $nameTokens));
            $score = $intersection / max(1, count(array_unique(array_merge($descriptionTokens, $nameTokens))));
            $phraseMatch = str_contains(
                $this->normalizeText((string) ($item['description'] ?? '')),
                $this->normalizeText($name),
            );

            if ($phraseMatch) {
                $score = max($score, 0.9);
            }

            if ($intersection >= 2 && $score > $bestScore) {
                $best = $row;
                $bestScore = $score;
            }
        }

        if ($best && $bestScore >= 0.55) {
            return $this->mappingPayload($best, 'description_match', round($bestScore, 3));
        }

        return $this->unmappedPayload();
    }

    /**
     * @return array<string, mixed>
     */
    protected function mappingPayload(BinCatalogCode $row, string $method, float $confidence): array
    {
        return [
            'bin_id' => $row->bin_id,
            'bin_label' => trim(($row->bin?->section?->name ?? $row->bin?->section?->code).' / '.($row->bin?->code ?? '')),
            'section_code' => $row->bin?->section?->code,
            'mapping_method' => $method,
            'mapping_confidence' => $confidence,
            'matched_catalog_code' => $row->code,
            'matched_catalog_name' => $row->source_name,
            'matched_catalog_description' => $row->source_description,
            'image_path' => $row->image_path,
            'image_url' => $this->imageUrl($row->image_path),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function unmappedPayload(): array
    {
        return [
            'bin_id' => null,
            'bin_label' => null,
            'section_code' => null,
            'mapping_method' => 'unmapped',
            'mapping_confidence' => 0,
            'matched_catalog_code' => null,
            'matched_catalog_name' => null,
            'matched_catalog_description' => null,
            'image_path' => null,
            'image_url' => null,
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function tokens(string $value): array
    {
        $stopWords = ['and', 'for', 'the', 'with', 'mm', 'series', 'model', 'size'];
        $tokens = preg_split('/\s+/', $this->normalizeText($value)) ?: [];

        return array_values(array_unique(array_filter(
            $tokens,
            fn (string $token) => mb_strlen($token) >= 3 && ! in_array($token, $stopWords, true),
        )));
    }

    protected function normalizeText(string $value): string
    {
        return Str::squish(mb_strtolower(preg_replace('/[^[:alnum:]]+/u', ' ', $value) ?? $value));
    }

    protected function normalizeCode(string $code): string
    {
        return Str::upper(preg_replace('/[\s_\-]+/', '', trim($code)) ?? trim($code));
    }

    protected function imageUrl(?string $imagePath): ?string
    {
        if (! $imagePath) {
            return null;
        }

        $normalized = ltrim(str_replace('\\', '/', $imagePath), '/');
        if (str_starts_with($normalized, 'public/')) {
            $normalized = substr($normalized, 7);
        }

        return BiboStorage::publicUrlPrefix().'/'.$normalized;
    }
}
