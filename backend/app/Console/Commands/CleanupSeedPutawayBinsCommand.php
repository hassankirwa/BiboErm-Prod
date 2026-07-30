<?php

namespace App\Console\Commands;

use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\MasterData\BinCatalogExcelService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Deactivate dummy door-type accessory / frame bins from WarehouseStructureSeeder
 * and backfill catalog putaway metadata for items imported from Premium/Standard/
 * Balustrade/Specialty workbooks.
 */
class CleanupSeedPutawayBinsCommand extends Command
{
    protected $signature = 'warehouse:cleanup-seed-putaway-bins
                            {--dry-run : Show what would change without writing}
                            {--force : Deactivate even when stock_levels or default_bin refs exist}';

    protected $description = 'Deactivate seed door-type accessory bins; keep only catalog-upload cages (Premium/Standard/Balustrade/Specialty)';

    /** @var list<string> */
    private const SEED_SECTION_CODES = [
        'SEC-SLD',
        'SEC-FLD',
        'SEC-CSM',
        'SEC-BTH',
        'SEC-AWN',
        'SEC-GEN',
        'SEC-ALU-SLD-FRAME',
        'SEC-ALU-CSM-FRAME',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $sections = Section::query()
            ->whereIn('code', self::SEED_SECTION_CODES)
            ->with('bins')
            ->get();

        $binIds = $sections->flatMap(fn (Section $s) => $s->bins->pluck('id'))->map(fn ($id) => (int) $id)->unique()->values();

        $stocked = StockLevel::query()
            ->whereIn('bin_id', $binIds)
            ->where(function ($q) {
                $q->where('quantity_on_hand', '>', 0)
                    ->orWhere('quantity_reserved', '>', 0);
            })
            ->pluck('bin_id')
            ->unique()
            ->all();

        $defaultRefs = collect()
            ->merge(Accessory::query()->whereIn('default_bin_id', $binIds)->pluck('default_bin_id'))
            ->merge(AluminiumProfile::query()->whereIn('default_bin_id', $binIds)->pluck('default_bin_id'))
            ->unique()
            ->values()
            ->all();

        $this->info('Seed sections found: '.$sections->count());
        $this->info('Seed bins found: '.$binIds->count());
        $this->info('Bins with stock: '.count($stocked));
        $this->info('Bins referenced as default_bin_id: '.count($defaultRefs));

        if ($stocked !== [] && ! $force) {
            $this->warn('Some seed bins still hold stock. Re-run with --force to deactivate them anyway, or move stock first.');
            $this->line('Stocked bin ids: '.implode(', ', $stocked));
        }

        $deactivateBinIds = $binIds
            ->reject(fn (int $id) => in_array($id, $stocked, true) && ! $force)
            ->values();

        if ($dryRun) {
            $this->comment('[dry-run] Would deactivate '.$deactivateBinIds->count().' bins and '.$sections->count().' sections.');
        } else {
            DB::transaction(function () use ($deactivateBinIds, $sections, $defaultRefs) {
                if ($deactivateBinIds->isNotEmpty()) {
                    Bin::query()->whereIn('id', $deactivateBinIds)->update(['is_active' => false]);
                }

                Section::query()
                    ->whereIn('id', $sections->pluck('id'))
                    ->update(['is_active' => false]);

                // Clear default_bin pointers that still target deactivated seed bins.
                if ($defaultRefs !== []) {
                    Accessory::query()->whereIn('default_bin_id', $defaultRefs)->update(['default_bin_id' => null]);
                    AluminiumProfile::query()->whereIn('default_bin_id', $defaultRefs)->update(['default_bin_id' => null]);
                }
            });

            $this->info('Deactivated '.$deactivateBinIds->count().' seed bins and '.$sections->count().' sections.');
        }

        $backfilled = $this->backfillCatalogMetadata($dryRun);
        $this->info(($dryRun ? '[dry-run] Would backfill' : 'Backfilled')." catalog putaway metadata on {$backfilled} items.");

        return self::SUCCESS;
    }

    protected function backfillCatalogMetadata(bool $dryRun): int
    {
        $sectionByTier = BinCatalogExcelService::FILE_TO_SECTION;
        $updated = 0;

        Item::query()
            ->whereNotNull('catalog_tier')
            ->whereIn('catalog_tier', array_keys($sectionByTier))
            ->orderBy('id')
            ->chunkById(200, function ($items) use ($sectionByTier, $dryRun, &$updated) {
                foreach ($items as $item) {
                    $tier = strtolower(trim((string) $item->catalog_tier));
                    $sectionCode = $sectionByTier[$tier] ?? null;
                    if ($sectionCode === null) {
                        continue;
                    }

                    $cage1Id = Bin::query()
                        ->where('is_active', true)
                        ->where('code', 'CAGE1')
                        ->whereHas('section', fn ($q) => $q->where('code', $sectionCode)->where('is_active', true))
                        ->value('id');

                    $metadata = is_array($item->catalog_metadata) ? $item->catalog_metadata : [];
                    $changed = false;

                    if (($metadata['bin_section_code'] ?? null) !== $sectionCode) {
                        $metadata['bin_section_code'] = $sectionCode;
                        $changed = true;
                    }

                    if ($cage1Id && (int) ($metadata['default_bin_id'] ?? 0) !== (int) $cage1Id) {
                        $metadata['default_bin_id'] = (int) $cage1Id;
                        $changed = true;
                    }

                    if (! $changed) {
                        continue;
                    }

                    $updated++;
                    if (! $dryRun) {
                        $item->forceFill(['catalog_metadata' => $metadata])->save();

                        if ($cage1Id && $item->category?->value === 'accessory') {
                            Accessory::query()->where('item_id', $item->id)->update([
                                'default_bin_id' => (int) $cage1Id,
                            ]);
                        }

                        if ($cage1Id && $item->category?->value === 'aluminium_profile') {
                            AluminiumProfile::query()->where('item_id', $item->id)->update([
                                'default_bin_id' => (int) $cage1Id,
                            ]);
                        }
                    }
                }
            });

        return $updated;
    }
}
