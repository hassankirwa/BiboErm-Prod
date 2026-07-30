<?php

namespace App\Services\Procurement\Glass;

class GlassAreaCalculator
{
    /**
     * Area in m² for a pane line: (W_mm/1000)×(H_mm/1000)×qty.
     */
    public static function areaM2(float|int|string $widthMm, float|int|string $heightMm, float|int|string $quantity): float
    {
        $width = (float) $widthMm;
        $height = (float) $heightMm;
        $qty = (float) $quantity;

        if ($width <= 0 || $height <= 0 || $qty <= 0) {
            return 0.0;
        }

        return round(($width / 1000) * ($height / 1000) * $qty, 6);
    }

    public static function pricePerSqm(float|int|string $buyingPrice, float $areaM2): ?float
    {
        $price = (float) $buyingPrice;
        if ($areaM2 <= 0 || $price < 0) {
            return null;
        }

        return round($price / $areaM2, 4);
    }
}
