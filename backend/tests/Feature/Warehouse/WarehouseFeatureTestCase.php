<?php

namespace Tests\Feature\Warehouse;

use Tests\Feature\FeatureTestCase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;

abstract class WarehouseFeatureTestCase extends FeatureTestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        config(['bibo.device_lock.enabled' => false]);
    }
}
