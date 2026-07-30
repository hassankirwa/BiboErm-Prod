<?php

namespace App\Services\Warehouse\MasterData;

use Illuminate\Support\Str;

class SkuNormalizer
{
    /**
     * @return array<int, string>
     */
    public function variants(?string $code): array
    {
        $code = $this->clean($code);
        if ($code === null) {
            return [];
        }

        $variants = [$code];
        $upper = strtoupper($code);
        $variants[] = $upper;

        $noSpaces = str_replace([' ', '_'], '', $upper);
        $variants[] = $noSpaces;

        $hyphenated = $this->insertHyphenAfterLetters($noSpaces);
        if ($hyphenated !== null) {
            $variants[] = $hyphenated;
        }

        $dehyphenated = str_replace('-', '', $upper);
        $variants[] = $dehyphenated;

        if (preg_match('/^([A-Z]{1,4})-?(\d+[A-Z0-9]*)$/i', $upper, $matches)) {
            $variants[] = strtoupper($matches[1]).$matches[2];
            $variants[] = strtoupper($matches[1]).'-'.$matches[2];
        }

        return array_values(array_unique(array_filter($variants)));
    }

    public function canonical(?string $code): ?string
    {
        $variants = $this->variants($code);

        return $variants[0] ?? null;
    }

    protected function insertHyphenAfterLetters(string $value): ?string
    {
        if (preg_match('/^([A-Z]{1,4})(\d.+)$/i', $value, $matches)) {
            return strtoupper($matches[1]).'-'.$matches[2];
        }

        return null;
    }

    protected function clean(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = Str::squish(trim($value));

        return $value === '' ? null : $value;
    }
}
