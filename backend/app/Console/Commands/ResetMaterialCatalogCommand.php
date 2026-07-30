<?php

namespace App\Console\Commands;

use App\Models\Warehouse\Item;
use App\Services\Warehouse\MasterData\MaterialBinMapper;
use App\Services\Warehouse\MasterData\MaterialMasterExcelService;
use App\Services\Warehouse\MasterData\MaterialMasterSyncService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetMaterialCatalogCommand extends Command
{
    protected $signature = 'warehouse:reset-material-catalog {file : Path to Completed_Inventory_Materials.xlsx}';

    protected $description = 'Deactivate/delete mistaken catalog-tier items and reseed from material master file';

    public function __construct(
        protected MaterialMasterExcelService $materials,
        protected MaterialBinMapper $mapper,
        protected MaterialMasterSyncService $sync,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $path = (string) $this->argument('file');
        if (! is_file($path)) {
            $this->error('File not found: '.$path);

            return self::FAILURE;
        }

        [$deleted, $deactivated] = $this->purgeMistakenCatalogItems();
        $this->info("Catalog cleanup complete. Deleted: {$deleted}; deactivated: {$deactivated}");

        $uploaded = new UploadedFile($path, basename($path), test: true);
        $items = $this->mapper->mapItems(
            $this->materials->extractFromUpload($uploaded)['items']
        );
        $result = $this->sync->syncItems($items);

        $this->info(sprintf(
            'Material master sync complete. Added: %d; updated: %d; unchanged: %d; mapped: %d; unmapped: %d',
            $result['added'] ?? 0,
            $result['updated'] ?? 0,
            $result['unchanged'] ?? 0,
            $result['mapped'] ?? 0,
            $result['unmapped'] ?? 0,
        ));

        return self::SUCCESS;
    }

    protected function purgeMistakenCatalogItems(): array
    {
        $deleted = 0;
        $deactivated = 0;

        Item::query()
            ->where(function ($query) {
                $query->whereNotNull('catalog_tier')
                    ->orWhere('catalog_metadata->material_master', true);
            })
            ->chunkById(200, function ($items) use (&$deleted, &$deactivated) {
                foreach ($items as $item) {
                    if ($this->canDelete($item->id)) {
                        $item->delete();
                        $deleted++;
                        continue;
                    }

                    $item->update([
                        'is_active' => false,
                        'catalog_tier' => null,
                    ]);
                    $deactivated++;
                }
            });

        return [$deleted, $deactivated];
    }

    protected function canDelete(int $itemId): bool
    {
        if (DB::table('stock_levels')->where('item_id', $itemId)->exists()) {
            return false;
        }
        $references = [
            ['project_bom_lines', 'warehouse_item_id'],
            ['purchase_requisition_lines', 'warehouse_item_id'],
            ['purchase_order_lines', 'warehouse_item_id'],
            ['goods_receipt_lines', 'warehouse_item_id'],
        ];

        foreach ($references as [$table, $column]) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column) && DB::table($table)->where($column, $itemId)->exists()) {
                return false;
            }
        }

        return true;
    }
}
