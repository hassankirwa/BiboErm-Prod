<?php

namespace App\Services\Excel\Structure;

use Illuminate\Support\Str;

class ExcelRowUtils
{
    public static function clean(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = Str::squish(trim($value));

        return $value === '' ? null : $value;
    }

    /**
     * @param  array<int, string|null>  $cells
     */
    public static function isBlankRow(array $cells): bool
    {
        foreach ($cells as $cell) {
            if ($cell !== null && $cell !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<int, string|null>  $cells
     */
    public static function isCounterOnlyRow(
        ?string $no,
        ?string $name,
        ?string $code,
        ?string $description,
        ?string $length,
        ?string $total,
    ): bool {
        return $no !== null
            && preg_match('/^\d+$/', $no)
            && $name === null
            && $code === null
            && $description === null
            && $length === null
            && $total === null;
    }

    public static function parseQuantity(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $normalized = Str::squish(str_replace(',', '', $value));
        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return (float) $normalized;
    }

    public static function lengthToMm(?string $length): ?int
    {
        if ($length === null || ! is_numeric($length)) {
            return null;
        }

        $value = (float) $length;

        return $value > 0 && $value < 100 ? (int) round($value * 1000) : (int) round($value);
    }
}
