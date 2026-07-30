<?php

namespace Tests\Feature\Procurement;

use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Procurement\RequisitionTrigger;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Procurement\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PurchaseRequisitionUpdateAndPoTest extends TestCase
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
            'procurement.approve',
            'procurement.requisition.view',
            'procurement.requisition.update',
            'procurement.requisition.create',
            'procurement.requisition.approve',
            'procurement.po.view',
            'procurement.po.create',
        ] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->manager = User::factory()->create();
        $this->manager->givePermissionTo([
            'procurement.view',
            'procurement.manage',
            'procurement.approve',
            'procurement.requisition.view',
            'procurement.requisition.update',
            'procurement.requisition.create',
            'procurement.requisition.approve',
            'procurement.po.view',
            'procurement.po.create',
        ]);
    }

    public function test_draft_requisition_can_update_qty_supplier_and_required_by(): void
    {
        $supplierA = $this->makeSupplier('SUP-A', 'Supplier A');
        $supplierB = $this->makeSupplier('SUP-B', 'Supplier B');
        $requisition = $this->makeDraftRequisition($supplierA, [
            ['description' => 'Profile A', 'quantity' => 10, 'required_quantity' => 8],
            ['description' => 'Accessory B', 'quantity' => 5, 'required_quantity' => 5],
        ]);

        $lineA = $requisition->lines->firstWhere('description', 'Profile A');
        $lineB = $requisition->lines->firstWhere('description', 'Accessory B');

        $response = $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/requisitions/{$requisition->id}", [
                'supplier_id' => $supplierA->id,
                'required_by' => '2026-08-15',
                'notes' => 'Updated for multi-supplier PO',
                'lines' => [
                    [
                        'id' => $lineA->id,
                        'quantity' => 12,
                        'preferred_supplier_id' => $supplierA->id,
                    ],
                    [
                        'id' => $lineB->id,
                        'quantity' => 7,
                        'preferred_supplier_id' => $supplierB->id,
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.required_by', '2026-08-15')
            ->assertJsonPath('data.supplier_id', $supplierA->id)
            ->assertJsonPath('data.notes', 'Updated for multi-supplier PO');

        $lineA->refresh();
        $lineB->refresh();

        $this->assertSame('12.000', $lineA->quantity);
        $this->assertSame($supplierA->id, $lineA->preferred_supplier_id);
        $this->assertSame('7.000', $lineB->quantity);
        $this->assertSame($supplierB->id, $lineB->preferred_supplier_id);
        $this->assertTrue(
            collect($response->json('data.lines'))->contains(fn (array $line) => (int) $line['id'] === $lineA->id)
        );
    }

    public function test_approved_requisition_cannot_be_updated(): void
    {
        $supplier = $this->makeSupplier('SUP-C', 'Supplier C');
        $requisition = $this->makeDraftRequisition($supplier, [
            ['description' => 'Item', 'quantity' => 3, 'required_quantity' => 3],
        ]);
        $requisition->update(['status' => RequisitionStatus::Approved]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/procurement/requisitions/{$requisition->id}", [
                'required_by' => '2026-09-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_batch_creates_one_po_per_supplier_from_requisition_lines(): void
    {
        $supplierA = $this->makeSupplier('SUP-D', 'Supplier D');
        $supplierB = $this->makeSupplier('SUP-E', 'Supplier E');
        $requisition = $this->makeDraftRequisition($supplierA, [
            ['description' => 'Line A', 'quantity' => 4, 'required_quantity' => 4],
            ['description' => 'Line B', 'quantity' => 6, 'required_quantity' => 6],
        ]);

        $lineA = $requisition->lines->firstWhere('description', 'Line A');
        $lineB = $requisition->lines->firstWhere('description', 'Line B');

        $lineA->update(['preferred_supplier_id' => $supplierA->id]);
        $lineB->update(['preferred_supplier_id' => $supplierB->id]);
        $requisition->update([
            'status' => RequisitionStatus::Approved,
            'required_by' => '2026-08-20',
            'approved_by' => $this->manager->id,
            'approved_at' => now(),
        ]);

        $draft = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/procurement/purchase-orders/draft?requisition_ids[]='.$requisition->id)
            ->assertOk()
            ->json('data.groups');

        $this->assertCount(2, $draft);

        $payload = [
            'groups' => collect($draft)->map(fn (array $group) => [
                'requisition_ids' => $group['requisition_ids'],
                'supplier_id' => $group['supplier_id'],
                'project_id' => $group['project_id'],
                'expected_delivery' => $group['expected_delivery'] ?? '2026-08-20',
                'tax' => 0,
                'lines' => collect($group['lines'])->map(fn (array $line) => [
                    'requisition_id' => $line['requisition_id'],
                    'requisition_line_id' => $line['requisition_line_id'],
                    'description' => $line['description'],
                    'quantity' => (float) $line['quantity'],
                    'unit_price' => (float) $line['unit_price'],
                    'warehouse_item_id' => $line['warehouse_item_id'],
                    'sku' => $line['sku'],
                ])->all(),
            ])->values()->all(),
        ];

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders/batch', $payload);

        $response->assertCreated();
        $this->assertCount(2, $response->json('data'));

        $orders = PurchaseOrder::query()->where('requisition_id', $requisition->id)->with('lines')->get();
        $this->assertCount(2, $orders);
        $this->assertEqualsCanonicalizing(
            [$supplierA->id, $supplierB->id],
            $orders->pluck('supplier_id')->all(),
        );

        $orderedLineIds = $orders->flatMap(fn (PurchaseOrder $order) => $order->lines->pluck('requisition_line_id'))->all();
        $this->assertEqualsCanonicalizing([$lineA->id, $lineB->id], $orderedLineIds);
    }

    public function test_create_po_rejects_missing_supplier(): void
    {
        $requisition = $this->makeDraftRequisition(null, [
            ['description' => 'No supplier line', 'quantity' => 2, 'required_quantity' => 2],
        ]);
        $requisition->update(['status' => RequisitionStatus::Approved]);

        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/procurement/purchase-orders/draft?requisition_ids[]='.$requisition->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['requisition_ids']);
    }

    /**
     * @param  list<array{description: string, quantity: float|int, required_quantity: float|int}>  $lines
     */
    protected function makeDraftRequisition(?Supplier $supplier, array $lines): PurchaseRequisition
    {
        $requisition = PurchaseRequisition::query()->create([
            'reference' => 'PR-TEST-'.Str::upper(Str::random(5)),
            'supplier_id' => $supplier?->id,
            'status' => RequisitionStatus::Draft,
            'notes' => 'Auto-drafted from material shortage',
            'requested_by' => $this->manager->id,
        ]);

        foreach ($lines as $line) {
            PurchaseRequisitionLine::query()->create([
                'purchase_requisition_id' => $requisition->id,
                'description' => $line['description'],
                'quantity' => $line['quantity'],
                'required_quantity' => $line['required_quantity'],
                'trigger_type' => RequisitionTrigger::BomShortage->value,
                'preferred_supplier_id' => $line['preferred_supplier_id'] ?? null,
            ]);
        }

        return $requisition->fresh(['lines']);
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
