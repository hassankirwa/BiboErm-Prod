<?php

namespace Tests\Feature\Procurement;

use App\Enums\Procurement\PurchaseOrderStatus;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseOrderLine;
use App\Models\Procurement\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PurchaseOrderUpdateTest extends TestCase
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
            'procurement.po.view',
            'procurement.po.update',
        ] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->manager = User::factory()->create();
        $this->manager->givePermissionTo([
            'procurement.view',
            'procurement.manage',
            'procurement.po.view',
            'procurement.po.update',
        ]);
    }

    public function test_draft_purchase_order_can_update_supplier_delivery_and_lines(): void
    {
        $supplierA = $this->makeSupplier('SUP-PO-A', 'Supplier A');
        $supplierB = $this->makeSupplier('SUP-PO-B', 'Supplier B');
        $order = $this->makePurchaseOrder($supplierA, PurchaseOrderStatus::Draft, [
            ['description' => 'Profile A', 'quantity' => 10, 'unit_price' => 100],
            ['description' => 'Accessory B', 'quantity' => 5, 'unit_price' => 50],
        ]);

        $lineA = $order->lines->firstWhere('description', 'Profile A');
        $lineB = $order->lines->firstWhere('description', 'Accessory B');

        $response = $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/purchase-orders/{$order->id}", [
                'supplier_id' => $supplierB->id,
                'expected_delivery' => '2026-08-25',
                'tax' => 15,
                'lines' => [
                    [
                        'id' => $lineA->id,
                        'quantity' => 12,
                        'unit_price' => 110,
                    ],
                    [
                        'id' => $lineB->id,
                        'quantity' => 7,
                        'unit_price' => 55,
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.supplier_id', $supplierB->id)
            ->assertJsonPath('data.expected_delivery', '2026-08-25')
            ->assertJsonPath('data.is_editable', true)
            ->assertJsonPath('data.tax', '15.00')
            ->assertJsonPath('data.subtotal', '1705.00')
            ->assertJsonPath('data.total', '1720.00');

        $lineA->refresh();
        $lineB->refresh();

        $this->assertSame('12.000', $lineA->quantity);
        $this->assertSame('110.00', $lineA->unit_price);
        $this->assertSame('1320.00', $lineA->line_total);
        $this->assertSame('7.000', $lineB->quantity);
        $this->assertSame('55.00', $lineB->unit_price);
        $this->assertSame('385.00', $lineB->line_total);
    }

    public function test_sent_purchase_order_cannot_be_updated(): void
    {
        $supplier = $this->makeSupplier('SUP-PO-C', 'Supplier C');
        $order = $this->makePurchaseOrder($supplier, PurchaseOrderStatus::Sent, [
            ['description' => 'Item', 'quantity' => 3, 'unit_price' => 20],
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/purchase-orders/{$order->id}", [
                'expected_delivery' => '2026-09-01',
                'tax' => 5,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_approved_purchase_order_cannot_be_updated(): void
    {
        $supplier = $this->makeSupplier('SUP-PO-D', 'Supplier D');
        $order = $this->makePurchaseOrder($supplier, PurchaseOrderStatus::Approved, [
            ['description' => 'Item', 'quantity' => 2, 'unit_price' => 40],
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/purchase-orders/{$order->id}", [
                'tax' => 10,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /**
     * @param  list<array{description: string, quantity: float|int, unit_price: float|int}>  $lines
     */
    protected function makePurchaseOrder(Supplier $supplier, PurchaseOrderStatus $status, array $lines): PurchaseOrder
    {
        $subtotal = 0;
        foreach ($lines as $line) {
            $subtotal += ((float) $line['quantity']) * ((float) $line['unit_price']);
        }

        $order = PurchaseOrder::query()->create([
            'reference' => 'PO-TEST-'.Str::upper(Str::random(5)),
            'supplier_id' => $supplier->id,
            'status' => $status,
            'subtotal' => $subtotal,
            'tax' => 0,
            'total' => $subtotal,
            'expected_delivery' => '2026-08-01',
            'created_by' => $this->manager->id,
        ]);

        foreach ($lines as $line) {
            $qty = (float) $line['quantity'];
            $unitPrice = (float) $line['unit_price'];
            PurchaseOrderLine::query()->create([
                'purchase_order_id' => $order->id,
                'description' => $line['description'],
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => round($qty * $unitPrice, 2),
            ]);
        }

        return $order->fresh(['lines']);
    }

    protected function makeSupplier(string $code, string $name): Supplier
    {
        return Supplier::query()->create([
            'code' => $code,
            'name' => $name,
            'category' => 'aluminium',
            'is_active' => true,
            'is_preferred' => false,
        ]);
    }
}
