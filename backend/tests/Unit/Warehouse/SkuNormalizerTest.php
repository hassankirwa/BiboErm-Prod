<?php

namespace Tests\Unit\Warehouse;

use App\Services\Warehouse\MasterData\SkuNormalizer;
use Tests\TestCase;

class SkuNormalizerTest extends TestCase
{
    public function test_generates_hyphen_and_plain_variants_for_profile_codes(): void
    {
        $normalizer = app(SkuNormalizer::class);

        $variants = $normalizer->variants('PY24');

        $this->assertContains('PY24', $variants);
        $this->assertContains('PY-24', $variants);

        $variantsFromHyphen = $normalizer->variants('PY-24');
        $this->assertContains('PY24', $variantsFromHyphen);
        $this->assertContains('PY-24', $variantsFromHyphen);
    }
}
