<?php

namespace App\Services\Procurement;

use App\Enums\Procurement\SupplierCategory;
use App\Models\Procurement\Supplier;

final class SupplierCodeGenerator
{
    public function suggest(?SupplierCategory $category = null): ?string
    {
        if ($category === null) {
            return null;
        }

        $basePrefix = strtoupper((string) config('bibo.procurement.supplier_code_prefix', 'SUP'));
        $categoryPrefix = $category->codePrefix();
        $fullPrefix = "{$basePrefix}-{$categoryPrefix}";
        $defaultPad = max(1, (int) config('bibo.procurement.supplier_category_code_pad', 2));

        /** @var list<string> $codes */
        $codes = Supplier::withTrashed()->pluck('code')->all();

        $matchingCodes = array_values(array_filter(
            $codes,
            fn (string $code) => $this->parseCategorizedCode($code, $fullPrefix) !== null,
        ));

        $last = $this->resolveLatestCategorizedCode($matchingCodes, $fullPrefix);

        if ($last !== null) {
            return $this->incrementCategorizedCode($fullPrefix, $last['sequence'], $last['pad']);
        }

        return sprintf('%s-%0'.$defaultPad.'d', $fullPrefix, 1);
    }

    /**
     * @param  list<string>  $codes
     * @return array{sequence: int, pad: int}|null
     */
    private function resolveLatestCategorizedCode(array $codes, string $fullPrefix): ?array
    {
        $latest = null;

        foreach ($codes as $code) {
            $parsed = $this->parseCategorizedCode($code, $fullPrefix);

            if ($parsed === null) {
                continue;
            }

            if ($latest === null || $parsed['sequence'] > $latest['sequence']) {
                $latest = $parsed;
            }
        }

        return $latest;
    }

    /**
     * @return array{sequence: int, pad: int}|null
     */
    private function parseCategorizedCode(string $code, string $fullPrefix): ?array
    {
        $code = strtoupper(trim($code));
        $pattern = '/^'.preg_quote($fullPrefix, '/').'-(\d+)$/';

        if (! preg_match($pattern, $code, $matches)) {
            return null;
        }

        return [
            'sequence' => (int) $matches[1],
            'pad' => strlen($matches[1]),
        ];
    }

    private function incrementCategorizedCode(string $fullPrefix, int $sequence, int $pad): string
    {
        return sprintf('%s-%0'.$pad.'d', $fullPrefix, $sequence + 1);
    }
}
