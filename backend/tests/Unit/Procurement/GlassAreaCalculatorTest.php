<?php

namespace Tests\Unit\Procurement;

use App\Services\Procurement\Glass\GlassAreaCalculator;
use PHPUnit\Framework\TestCase;

class GlassAreaCalculatorTest extends TestCase
{
    public function test_area_and_price_per_sqm(): void
    {
        $area = GlassAreaCalculator::areaM2(1200, 800, 2);
        $this->assertSame(1.92, $area);
        $this->assertSame(2500.0, GlassAreaCalculator::pricePerSqm(4800, $area));
    }

    public function test_invalid_dimensions_yield_zero_area(): void
    {
        $this->assertSame(0.0, GlassAreaCalculator::areaM2(0, 800, 1));
        $this->assertNull(GlassAreaCalculator::pricePerSqm(100, 0));
    }
}
