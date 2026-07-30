<?php

namespace App\Console\Commands;

use App\Services\Warehouse\MasterData\BinCatalogExcelService;
use Illuminate\Console\Command;

class BackfillCatalogItemsFromBinsCommand extends Command
{
    protected $signature = 'warehouse:backfill-catalog-from-bins
                            {--dry-run : Report matches without writing}';

    protected $description = 'Set catalog_tier / images on warehouse items from imported bin catalog codes (and create missing items)';

    public function handle(BinCatalogExcelService $catalogs): int
    {
        $result = $catalogs->backfillWarehouseItemsFromBinCodes(
            dryRun: (bool) $this->option('dry-run'),
        );

        $this->info(sprintf(
            'Updated: %d; created: %d; skipped: %d; codes: %d',
            $result['updated'],
            $result['created'],
            $result['skipped'],
            $result['codes'],
        ));

        if (($result['dry_run'] ?? false) === true) {
            $this->comment('Dry run only — no changes written.');
        }

        return self::SUCCESS;
    }
}
