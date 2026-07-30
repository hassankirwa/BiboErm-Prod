<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\ItemCategory;
use App\Services\Excel\Structure\DimensionParser;
use App\Services\Excel\Structure\MaterialClassifier;
use Tests\TestCase;

class MaterialClassifierTest extends TestCase
{
    public function test_classifies_gl_prefixed_codes_as_aluminium_profiles(): void
    {
        $classifier = new MaterialClassifier(new DimensionParser);

        $category = $classifier->classifyForCatalog(
            category: null,
            name: 'Blade',
            section: 'Louver',
            catalogTier: 'specialty',
            inHardwareBlock: false,
            description: '95x16',
            code: 'GL-95M16',
            hasProfileTableContext: true,
        );

        $this->assertSame(ItemCategory::AluminiumProfile->value, $category);
    }
}
