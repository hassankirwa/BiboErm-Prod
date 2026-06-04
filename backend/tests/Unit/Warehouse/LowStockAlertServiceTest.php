<?php

namespace Tests\Unit\Warehouse;

use App\Events\Warehouse\WarehouseLowStockDetected;
use App\Notifications\Warehouse\LowStockNotification;
use App\Services\Warehouse\Inventory\LowStockAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class LowStockAlertServiceTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();
    }

    public function test_low_stock_scan_notifies_procurement_officers(): void
    {
        Notification::fake();

        $item = $this->itemBySku('ACC-HNG-001');
        $item->min_stock_qty = 99999;
        $item->save();

        $procurementOfficer = $this->procurementOfficer();

        app(LowStockAlertService::class)->scan();

        Notification::assertSentTo($procurementOfficer, LowStockNotification::class);
    }

    public function test_low_stock_scan_dispatches_domain_event(): void
    {
        Event::fake([WarehouseLowStockDetected::class]);

        $item = $this->itemBySku('ACC-HNG-001');
        $item->min_stock_qty = 99999;
        $item->save();

        app(LowStockAlertService::class)->scan();

        Event::assertDispatched(WarehouseLowStockDetected::class, fn (WarehouseLowStockDetected $event) => $event->warehouseItemId === $item->id);
    }
}
