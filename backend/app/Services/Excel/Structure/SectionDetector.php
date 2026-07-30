<?php

namespace App\Services\Excel\Structure;

use Illuminate\Support\Str;

class SectionDetector
{
    public function __construct(
        protected TableDetector $tables,
        protected DimensionParser $dimensions,
    ) {}

    /**
     * @param  array<int, array<int, mixed>>  $rows
     */
    public function resolveInitialSection(array $rows, string $sheetName): string
    {
        foreach (array_slice($rows, 0, 3) as $row) {
            foreach ($row as $cell) {
                $text = ExcelRowUtils::clean(is_scalar($cell) ? (string) $cell : null);
                if ($text === null) {
                    continue;
                }

                $normalized = Str::squish($text);
                if (mb_strlen($normalized) >= 6 && preg_match('/[A-Za-z]{3,}/', $normalized)) {
                    $cells = array_map(
                        fn (mixed $value) => ExcelRowUtils::clean(is_scalar($value) ? (string) $value : null),
                        $row,
                    );
                    if (! $this->tables->looksLikeHeader($cells)) {
                        return $normalized;
                    }
                }
            }
        }

        return $sheetName;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @param  array<string, int>  $headerMap
     */
    public function detectSectionTitle(array $cells, array $headerMap): ?string
    {
        if ($this->tables->looksLikeHeader($cells)) {
            return null;
        }

        $no = $cells[0] ?? null;
        if ($no !== null && preg_match('/^\d+$/', $no)) {
            return null;
        }

        if ($headerMap !== []) {
            $values = $this->tables->rowValues($cells, $headerMap);
            $hasData = $values['code'] !== null
                || ($values['no'] !== null && preg_match('/^\d+$/', (string) $values['no']))
                || ($values['name'] !== null && ($values['length'] !== null || $values['description'] !== null || $values['total'] !== null));

            if ($hasData) {
                return null;
            }
        }

        $filled = array_values(array_filter($cells, fn (?string $cell) => $cell !== null && $cell !== ''));
        if ($filled === []) {
            return null;
        }

        $candidate = null;
        foreach ($filled as $text) {
            if (mb_strlen($text) < 5 || ! preg_match('/[A-Za-z]{3,}/', $text)) {
                continue;
            }

            if ($candidate === null || mb_strlen($text) > mb_strlen($candidate)) {
                $candidate = Str::squish($text);
            }
        }

        return $candidate;
    }

    public function sectionIndicatesAccessories(string $section): bool
    {
        return str_contains(mb_strtoupper($section), 'ACCESSORIES');
    }

    public function accessoriesSectionLabel(string $sheetName): string
    {
        return trim($sheetName).' ACCESSORIES';
    }

    /**
     * Structural signal: after blank gap, row lacks profile-style dimension text and code.
     */
    public function shouldEnterHardwareBlock(
        ?string $name,
        ?string $code,
        ?string $description,
        ?string $no,
        bool $hasDimensionColumn,
    ): bool {
        if ($this->dimensions->looksLikeDimensionText($description ?? '')) {
            return false;
        }

        if ($code !== null) {
            return false;
        }

        if ($hasDimensionColumn && $description !== null && $this->dimensions->looksLikeDimensionText($description)) {
            return false;
        }

        if ($no !== null && preg_match('/^\d+$/', $no)) {
            return true;
        }

        if ($name !== null && ! $this->dimensions->looksLikeDimensionText($name)) {
            return ! $hasDimensionColumn || $description === null || ! $this->dimensions->looksLikeDimensionText($description);
        }

        return $description !== null && $name === null;
    }
}
