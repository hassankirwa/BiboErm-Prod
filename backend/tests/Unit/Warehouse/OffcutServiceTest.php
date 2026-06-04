<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\OffcutStatus;
use App\Models\User;
use App\Models\Warehouse\OffcutPiece;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;
use App\Services\Warehouse\Offcuts\OffcutLoggingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class OffcutServiceTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    private OffcutLoggingService $logging;

    private OffcutAllocationService $allocation;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        $this->logging = app(OffcutLoggingService::class);
        $this->allocation = app(OffcutAllocationService::class);
        $this->user = $this->warehouseAluminiumManager();
    }

    public function test_log_offcut_records_piece_and_stock(): void
    {
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');

        $offcut = $this->logging->log(
            user: $this->user,
            itemId: $item->id,
            binId: $bin->id,
            lengthMm: 900,
            quantityPieces: 1,
        );

        $this->assertStringStartsWith('OFF-', $offcut->offcut_number);
        $this->assertSame(OffcutStatus::Available, $offcut->status);

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();

        $this->assertSame('0.900', (string) $level->quantity_on_hand);
    }

    public function test_allocate_marks_offcut_for_project(): void
    {
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');
        $project = $this->createTestProject();

        $offcut = OffcutPiece::query()->create([
            'offcut_number' => 'OFF-UNIT-001',
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'length_mm' => 600,
            'quantity_pieces' => 1,
            'status' => OffcutStatus::Available,
            'logged_by' => $this->user->id,
            'logged_at' => now(),
            'created_at' => now(),
        ]);

        $allocated = $this->allocation->allocate($offcut, $project->id);

        $this->assertSame(OffcutStatus::Allocated, $allocated->status);
        $this->assertSame($project->id, $allocated->allocated_project_id);
    }
}
