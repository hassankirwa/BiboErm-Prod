<?php

namespace App\Services\Procurement;

use App\Models\Procurement\Driver;

final class DriverCodeGenerator
{
    public function suggest(): string
    {
        $prefix = strtoupper((string) config('bibo.procurement.driver_code_prefix', 'DRV'));
        $defaultPad = max(1, (int) config('bibo.procurement.driver_code_pad', 3));

        /** @var list<string> $codes */
        $codes = Driver::withTrashed()->pluck('code')->all();

        $matchingCodes = array_values(array_filter(
            $codes,
            fn (string $code) => $this->parseCode($code, $prefix) !== null,
        ));

        $last = $this->resolveLatestCode($matchingCodes, $prefix);

        if ($last !== null) {
            return $this->incrementCode($prefix, $last['sequence'], $last['pad']);
        }

        return sprintf('%s-%0'.$defaultPad.'d', $prefix, 1);
    }

    /**
     * @param  list<string>  $codes
     * @return array{sequence: int, pad: int}|null
     */
    private function resolveLatestCode(array $codes, string $prefix): ?array
    {
        $latest = null;

        foreach ($codes as $code) {
            $parsed = $this->parseCode($code, $prefix);

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
    private function parseCode(string $code, string $prefix): ?array
    {
        $code = strtoupper(trim($code));
        $pattern = '/^'.preg_quote($prefix, '/').'-(\d+)$/';

        if (! preg_match($pattern, $code, $matches)) {
            return null;
        }

        return [
            'sequence' => (int) $matches[1],
            'pad' => strlen($matches[1]),
        ];
    }

    private function incrementCode(string $prefix, int $sequence, int $pad): string
    {
        return sprintf('%s-%0'.$pad.'d', $prefix, $sequence + 1);
    }
}
