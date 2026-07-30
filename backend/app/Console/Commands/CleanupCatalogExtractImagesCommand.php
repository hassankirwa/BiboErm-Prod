<?php

namespace App\Console\Commands;

use App\Services\Warehouse\MasterData\CatalogImageStorage;
use Illuminate\Console\Command;

class CleanupCatalogExtractImagesCommand extends Command
{
    protected $signature = 'warehouse:cleanup-catalog-extracts
                            {--hours=24 : Delete extract folders older than this many hours}';

    protected $description = 'Delete abandoned material-catalog extract image folders';

    public function handle(CatalogImageStorage $images): int
    {
        $hours = max(1, (int) $this->option('hours'));
        $result = $images->cleanupStaleExtracts($hours);

        $this->info(sprintf(
            'Removed %d extract token folder(s) (%d file(s)) older than %d hour(s).',
            $result['deleted_tokens'],
            $result['deleted_files'],
            $hours,
        ));

        return self::SUCCESS;
    }
}
