<?php

namespace Tests\Feature\Procurement;

use App\Enums\Procurement\DriverStatus;
use App\Enums\Procurement\PurchaseOrderStatus;
use App\Models\Procurement\Driver;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\Supplier;
use App\Models\Procurement\TransportOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TransportOrderDriverOccupancyTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ([
            'procurement.view',
            'procurement.manage',
            'procurement.transport.manage',
        ] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->manager = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->manager->givePermissionTo([
            'procurement.view',
            'procurement.manage',
            'procurement.transport.manage',
        ]);
    }

    public function test_in_transit_requires_driver_and_occupies_them(): void
    {
        $po = $this->makePurchaseOrder();
        $driver = $this->makeDriver('DRV-OCC-1');

        $order = TransportOrder::query()->create([
            'transport_number' => 'TO-'.Str::upper(Str::random(6)),
            'purchase_order_id' => $po->id,
            'transport_type' => 'truck',
            'status' => 'scheduled',
            'created_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/transport/{$order->id}/status", [
                'status' => 'in_transit',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['driver_id']);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/transport/{$order->id}/status", [
                'status' => 'in_transit',
                'driver_id' => $driver->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_transit')
            ->assertJsonPath('data.driver_id', $driver->id);

        $this->assertSame(DriverStatus::Occupied, $driver->fresh()->status);
    }

    public function test_arrived_releases_driver_and_rejects_occupied_assignment(): void
    {
        $po = $this->makePurchaseOrder();
        $driver = $this->makeDriver('DRV-OCC-2');
        $other = $this->makeDriver('DRV-OCC-3');

        $order = TransportOrder::query()->create([
            'transport_number' => 'TO-'.Str::upper(Str::random(6)),
            'purchase_order_id' => $po->id,
            'transport_type' => 'truck',
            'driver_id' => $driver->id,
            'driver_name' => $driver->name,
            'status' => 'scheduled',
            'created_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/transport/{$order->id}/status", [
                'status' => 'in_transit',
            ])
            ->assertOk();

        $this->assertSame(DriverStatus::Occupied, $driver->fresh()->status);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/procurement/transport', [
                'purchase_order_id' => $po->id,
                'transport_type' => 'van',
                'driver_id' => $driver->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['driver_id']);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/transport/{$order->id}/status", [
                'status' => 'arrived',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'arrived');

        $this->assertSame(DriverStatus::Available, $driver->fresh()->status);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/procurement/transport', [
                'purchase_order_id' => $po->id,
                'transport_type' => 'van',
                'driver_id' => $other->id,
            ])
            ->assertCreated();
    }

    protected function makePurchaseOrder(): PurchaseOrder
    {
        $supplier = Supplier::query()->create([
            'code' => 'SUP-TO-'.Str::upper(Str::random(4)),
            'name' => 'Transport Supplier',
            'category' => 'aluminium',
            'is_active' => true,
            'is_preferred' => false,
        ]);

        return PurchaseOrder::query()->create([
            'reference' => 'PO-TO-'.Str::upper(Str::random(5)),
            'supplier_id' => $supplier->id,
            'status' => PurchaseOrderStatus::Approved,
            'subtotal' => 100,
            'tax' => 0,
            'total' => 100,
            'created_by' => $this->manager->id,
        ]);
    }

    protected function makeDriver(string $code): Driver
    {
        return Driver::query()->create([
            'code' => $code,
            'name' => "Driver {$code}",
            'phone' => '0700000000',
            'vehicle_registration' => 'KAA '.$code,
            'is_active' => true,
            'status' => DriverStatus::Available->value,
        ]);
    }
}
