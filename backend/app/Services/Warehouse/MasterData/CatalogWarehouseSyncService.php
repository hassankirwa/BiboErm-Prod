<?php

namespace App\Services\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Rubber;
use App\Services\Excel\Structure\DimensionParser;
use App\Services\Excel\Structure\ExcelRowUtils;
use App\Services\Excel\Structure\MaterialClassifier;
use App\Support\BiboStorage;
use Illuminate\Support\Str;

class CatalogWarehouseSyncService
{
    public const SYNC_MODES = ['incremental', 'new_only', 'full_metadata'];

    public function __construct(
        protected SkuNormalizer $skuNormalizer,
        protected WarehouseItemResolver $resolver,
        protected MaterialClassifier $materialClassifier,
        protected DimensionParser $dimensionParser,
        protected CatalogImageStorage $images,
    ) {}

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{
     *     new: array<int, array<string, mixed>>,
     *     existing_unchanged: array<int, array<string, mixed>>,
     *     existing_metadata_changed: array<int, array<string, mixed>>,
     *     existing_in_db_only: array<int, array<string, mixed>>,
     *     counts: array{new: int, unchanged: int, changed: int, in_db_only: int}
     * }
     */
    public function compareExtractedWithWarehouse(array $items, ?string $catalogTier = null): array
    {
        $new = [];
        $existingUnchanged = [];
        $existingChanged = [];
        $matchedItemIds = [];
        $existingBySku = $this->buildExistingSkuIndex($catalogTier);

        foreach ($items as $row) {
            $sku = $this->resolveRowSku($row);
            if ($sku === null) {
                continue;
            }

            $existing = $this->findExistingItemFromIndex($sku, $existingBySku);
            if ($existing === null) {
                $new[] = $row;

                continue;
            }

            $matchedItemIds[] = $existing->id;

            if ($this->hasMetadataChanges($existing, $row)) {
                $existingChanged[] = array_merge($row, ['_existing_item_id' => $existing->id]);
            } else {
                $existingUnchanged[] = array_merge($row, ['_existing_item_id' => $existing->id]);
            }
        }

        $existingInDbOnly = $this->loadDbOnlyItems($catalogTier, $matchedItemIds);

        return [
            'new' => $new,
            'existing_unchanged' => $existingUnchanged,
            'existing_metadata_changed' => $existingChanged,
            'existing_in_db_only' => $existingInDbOnly,
            'counts' => [
                'new' => count($new),
                'unchanged' => count($existingUnchanged),
                'changed' => count($existingChanged),
                'in_db_only' => count($existingInDbOnly),
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{
     *     added: int,
     *     updated: int,
     *     unchanged: int,
     *     skipped: int,
     *     stored: int,
     *     totals_recorded_as_reference: int,
     *     images_saved: int
     * }
     */
    public function syncItems(
        array $items,
        string $syncMode = 'incremental',
        string $sourceSystem = 'catalog',
    ): array {
        if (! in_array($syncMode, self::SYNC_MODES, true)) {
            $syncMode = 'incremental';
        }

        $added = 0;
        $updated = 0;
        $unchanged = 0;
        $skipped = 0;
        $totalsRecorded = 0;
        $imagesSaved = 0;

        $generalDoorTypeId = DoorType::query()->where('code', 'GEN')->value('id')
            ?? DoorType::query()->value('id');

        foreach ($items as $row) {
            try {
                $name = $this->clean($row['name'] ?? null);
                $sku = $this->resolveRowSku($row);

                if ($sku === null || $name === null) {
                    $skipped++;
                    continue;
                }

                $existing = $this->findExistingItem($sku);

                if ($existing !== null && $syncMode === 'new_only') {
                    if ($this->refreshReferenceTotal($existing, $row)) {
                        $totalsRecorded++;
                    }
                    $unchanged++;

                    continue;
                }

                if ($existing === null) {
                    $result = $this->createItem($row, $sku, $name, $sourceSystem, $generalDoorTypeId);
                    if ($result === null) {
                        $skipped++;
                        continue;
                    }
                    $added++;
                    $imagesSaved += $result['images_saved'];
                    if ($result['totals_recorded']) {
                        $totalsRecorded++;
                    }

                    continue;
                }

                if (! $this->hasMetadataChanges($existing, $row) && $syncMode !== 'full_metadata') {
                    if ($this->refreshReferenceTotal($existing, $row)) {
                        $totalsRecorded++;
                    }
                    $unchanged++;

                    continue;
                }

                $result = $this->updateItem(
                    $existing,
                    $row,
                    $sku,
                    $name,
                    $sourceSystem,
                    $generalDoorTypeId,
                    $syncMode === 'full_metadata',
                );
                if ($result === null) {
                    $skipped++;
                    continue;
                }
                $updated++;
                $imagesSaved += $result['images_saved'];
                if ($result['totals_recorded']) {
                    $totalsRecorded++;
                }
            } catch (\Throwable) {
                $skipped++;
            }
        }

        return [
            'added' => $added,
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped' => $skipped,
            'stored' => $added + $updated,
            'totals_recorded_as_reference' => $totalsRecorded,
            'images_saved' => $imagesSaved,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function createItem(
        array $row,
        string $sku,
        string $name,
        string $sourceSystem,
        ?int $generalDoorTypeId,
    ): ?array {
        $inAccessoryBlock = (bool) ($row['in_accessory_block'] ?? false);
        $category = $this->resolveCategory($row, $name, $sku, $inAccessoryBlock);
        $catalogTier = $this->clean($row['catalog_tier'] ?? null);
        $imageResult = $this->resolveImageForRow($row, $sku, $catalogTier, null);
        $dimensions = $this->dimensionParser->parseDimensions($row['description'] ?? null);
        $metadata = $this->buildCatalogMetadata($row);

        $item = Item::query()->create([
            'sku' => $sku,
            'name' => $name,
            'category' => $category,
            'unit_of_measure' => $row['unit_of_measure'] ?? $this->materialClassifier->defaultUnit($category),
            'door_type_id' => $category === ItemCategory::Accessory->value ? $generalDoorTypeId : null,
            'min_stock_qty' => 0,
            'is_active' => true,
            'catalog_tier' => $catalogTier,
            'description' => $this->clean($row['description'] ?? null),
            'image_path' => $imageResult['path'],
            'catalog_metadata' => $metadata,
        ]);

        $this->syncCategoryExtension($item, $row, $category, $dimensions, $generalDoorTypeId);
        $this->persistAliases($item, $row, $sku, $name, $category, $sourceSystem);

        return [
            'images_saved' => $imageResult['images_saved'],
            'totals_recorded' => $metadata !== null && isset($metadata['reference_total_qty']),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function updateItem(
        Item $existing,
        array $row,
        string $sku,
        string $name,
        string $sourceSystem,
        ?int $generalDoorTypeId,
        bool $refreshImages,
    ): ?array {
        $inAccessoryBlock = (bool) ($row['in_accessory_block'] ?? false);
        $category = $this->resolveCategory($row, $name, $sku, $inAccessoryBlock);
        $catalogTier = $this->clean($row['catalog_tier'] ?? null);
        $imageResult = $this->resolveImageForRow(
            $row,
            $sku,
            $catalogTier,
            $existing,
            $refreshImages || $existing->image_path === null,
        );
        $dimensions = $this->dimensionParser->parseDimensions($row['description'] ?? null);
        $metadata = $this->mergeCatalogMetadata($existing->catalog_metadata ?? [], $row);

        $existing->update([
            'name' => $name,
            'category' => $category,
            'unit_of_measure' => $row['unit_of_measure'] ?? $this->materialClassifier->defaultUnit($category),
            'door_type_id' => $category === ItemCategory::Accessory->value ? $generalDoorTypeId : $existing->door_type_id,
            'catalog_tier' => $catalogTier ?? $existing->catalog_tier,
            'description' => $this->clean($row['description'] ?? null),
            'image_path' => $imageResult['path'] ?? $existing->image_path,
            'catalog_metadata' => $metadata,
        ]);

        $this->syncCategoryExtension($existing->fresh(), $row, $category, $dimensions, $generalDoorTypeId);
        $this->persistAliases($existing, $row, $sku, $name, $category, $sourceSystem);

        return [
            'images_saved' => $imageResult['images_saved'],
            'totals_recorded' => isset($metadata['reference_total_qty']),
        ];
    }

    protected function refreshReferenceTotal(Item $item, array $row): bool
    {
        $refTotal = $this->referenceTotalFromRow($row);
        if ($refTotal === null) {
            return false;
        }

        $metadata = is_array($item->catalog_metadata) ? $item->catalog_metadata : [];
        $metadata['reference_total_qty'] = $refTotal;
        $metadata['reference_total_at'] = now()->toIso8601String();
        $metadata['total_qty'] = $refTotal;

        $item->update(['catalog_metadata' => $metadata]);

        return true;
    }

    protected function hasMetadataChanges(Item $existing, array $row): bool
    {
        $inAccessoryBlock = (bool) ($row['in_accessory_block'] ?? false);
        $name = $this->clean($row['name'] ?? null);
        $sku = $this->resolveRowSku($row);
        $category = $this->resolveCategory($row, $name ?? '', $sku ?? '', $inAccessoryBlock);

        if ($name !== null && $existing->name !== $name) {
            return true;
        }

        $existingCategory = $existing->category?->value ?? $existing->getRawOriginal('category');
        if ($category !== $existingCategory) {
            return true;
        }

        $newDescription = $this->clean($row['description'] ?? null);
        if ($newDescription !== $existing->description) {
            return true;
        }

        $newUnit = $row['unit_of_measure'] ?? $this->materialClassifier->defaultUnit($category);
        if ($newUnit !== $existing->unit_of_measure) {
            return true;
        }

        $newTier = $this->clean($row['catalog_tier'] ?? null);
        if ($newTier !== null && $newTier !== $existing->catalog_tier) {
            return true;
        }

        $newImagePath = $row['image_path'] ?? null;
        if (is_string($newImagePath) && $newImagePath !== '' && $existing->image_path === null) {
            return true;
        }

        $profileFamily = $row['profile_family'] ?? $row['source_sheet'] ?? null;
        if ($category === ItemCategory::AluminiumProfile->value && $profileFamily !== null) {
            $existing->loadMissing('aluminiumProfile');
            $existingFamily = $existing->aluminiumProfile?->profile_family;
            if ($existingFamily !== $profileFamily) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{path: ?string, images_saved: int}
     */
    protected function resolveImageForRow(
        array $row,
        string $sku,
        ?string $catalogTier,
        ?Item $existing,
        bool $allowReplace = true,
    ): array {
        $imagesSaved = 0;
        $imagePath = null;
        $dataUrl = $row['picture_data_url'] ?? $row['embedded_media']['data_url'] ?? null;

        if (is_string($row['image_path'] ?? null) && $row['image_path'] !== '') {
            $incomingPath = $row['image_path'];
            if ($this->images->isExtractPath($incomingPath) && $catalogTier !== null) {
                $storedImage = $this->images->promoteExtractPath($incomingPath, $sku, $catalogTier);
                if ($storedImage !== null) {
                    $imagePath = $storedImage['path'];
                    $imagesSaved++;
                }
            } else {
                $imagePath = $incomingPath;
            }
        } elseif ($allowReplace && is_string($dataUrl) && str_starts_with($dataUrl, 'data:') && $catalogTier !== null) {
            $storedImage = $this->images->storeDataUrl($dataUrl, $sku, $catalogTier);
            if ($storedImage !== null) {
                $imagePath = $storedImage['path'];
                $imagesSaved++;
            }
        }

        if ($existing?->image_path && $imagePath && $existing->image_path !== $imagePath) {
            $this->images->delete($existing->image_path);
        }

        return ['path' => $imagePath, 'images_saved' => $imagesSaved];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function resolveCategory(array $row, string $name, string $sku, bool $inAccessoryBlock): string
    {
        return $this->materialClassifier->classifyForCatalog(
            $row['category'] ?? null,
            $name,
            $row['profile_family'] ?? $row['source_sheet'] ?? null,
            $row['catalog_tier'] ?? null,
            $inAccessoryBlock,
            $row['description'] ?? null,
            $sku,
            hasProfileTableContext: ! $inAccessoryBlock && $sku !== '',
        );
    }

    /**
     * @param  array<string, mixed>  $dimensions
     */
    protected function syncCategoryExtension(
        Item $item,
        array $row,
        string $category,
        array $dimensions,
        ?int $generalDoorTypeId,
    ): void {
        $catalogTier = $item->catalog_tier ?? $this->clean($row['catalog_tier'] ?? null);
        $defaultBinId = $this->resolveCatalogDefaultBinId($item->sku, $catalogTier, $row);
        $this->persistDefaultBinMetadata($item, $defaultBinId, $catalogTier);

        if ($category === ItemCategory::AluminiumProfile->value) {
            $payload = [
                'profile_family' => $row['profile_family'] ?? $row['source_sheet'] ?? 'General',
                'width_mm' => $row['width_mm'] ?? $dimensions['width_mm'] ?? null,
                'depth_mm' => $row['depth_mm'] ?? $dimensions['depth_mm'] ?? null,
                'finish' => $row['finish'] ?? null,
                'weight_per_metre' => $row['weight_per_metre'] ?? null,
                'standard_bar_length_mm' => $row['standard_bar_length_mm'] ?? null,
            ];
            if ($defaultBinId !== null) {
                $payload['default_bin_id'] = $defaultBinId;
            }

            AluminiumProfile::query()->updateOrCreate(
                ['item_id' => $item->id],
                $payload,
            );
        } elseif ($category === ItemCategory::Accessory->value && $generalDoorTypeId) {
            $payload = ['door_type_id' => $generalDoorTypeId];
            if ($defaultBinId !== null) {
                $payload['default_bin_id'] = $defaultBinId;
            }

            Accessory::query()->updateOrCreate(
                ['item_id' => $item->id],
                $payload,
            );
        } elseif ($category === ItemCategory::Rubber->value) {
            Rubber::query()->updateOrCreate(
                ['item_id' => $item->id],
                ['compatible_profile_ids' => null, 'default_section_id' => null],
            );
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function resolveCatalogDefaultBinId(string $sku, ?string $catalogTier, array $row): ?int
    {
        if (isset($row['bin_id']) && is_numeric($row['bin_id'])) {
            $explicit = (int) $row['bin_id'];
            if (Bin::query()->whereKey($explicit)->where('is_active', true)->exists()) {
                return $explicit;
            }
        }

        $normalized = Str::upper(preg_replace('/[\s_\-]+/', '', trim($sku)) ?? trim($sku));
        if ($normalized !== '') {
            $fromCode = BinCatalogCode::query()
                ->where('normalized_code', $normalized)
                ->value('bin_id');
            if ($fromCode) {
                return (int) $fromCode;
            }
        }

        if ($catalogTier === null || $catalogTier === '') {
            return null;
        }

        $sectionCode = BinCatalogExcelService::FILE_TO_SECTION[$catalogTier] ?? null;
        if ($sectionCode === null) {
            return null;
        }

        $binId = Bin::query()
            ->where('is_active', true)
            ->whereHas('section', fn ($q) => $q->where('code', $sectionCode)->where('is_active', true))
            ->orderByRaw("CASE WHEN code = 'CAGE1' THEN 0 ELSE 1 END")
            ->orderBy('sort_order')
            ->value('id');

        return $binId ? (int) $binId : null;
    }

    protected function persistDefaultBinMetadata(Item $item, ?int $defaultBinId, ?string $catalogTier): void
    {
        if ($defaultBinId === null) {
            return;
        }

        $metadata = is_array($item->catalog_metadata) ? $item->catalog_metadata : [];
        $metadata['default_bin_id'] = $defaultBinId;

        $sectionCode = $catalogTier !== null
            ? (BinCatalogExcelService::FILE_TO_SECTION[$catalogTier] ?? null)
            : null;
        if ($sectionCode !== null) {
            $metadata['bin_section_code'] = $sectionCode;
        }

        $item->forceFill(['catalog_metadata' => $metadata])->save();
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function persistAliases(
        Item $item,
        array $row,
        string $sku,
        string $name,
        string $category,
        string $sourceSystem,
    ): void {
        $this->resolver->persistAlias(
            warehouseItemId: $item->id,
            sourceSystem: $sourceSystem,
            sourceCode: $row['source_code'] ?? $sku,
            sourceName: $row['source_name'] ?? $name,
            series: $row['source_sheet'] ?? null,
            lineType: $category,
        );

        $this->resolver->persistSkuVariantAliases(
            warehouseItemId: $item->id,
            canonicalSku: $sku,
            sourceSystem: $sourceSystem,
            series: $row['source_sheet'] ?? null,
            lineType: $category,
        );
    }

    /**
     * @param  array<string, mixed>  $existingMetadata
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>|null
     */
    protected function mergeCatalogMetadata(array $existingMetadata, array $row): ?array
    {
        $metadata = $existingMetadata;
        $incoming = is_array($row['catalog_metadata'] ?? null) ? $row['catalog_metadata'] : [];

        foreach ($incoming as $key => $value) {
            if (in_array($key, ['total_qty', 'reference_total_qty', 'reference_total_at'], true)) {
                continue;
            }
            if ($value !== null) {
                $metadata[$key] = $value;
            }
        }

        $refTotal = $this->referenceTotalFromRow($row);
        if ($refTotal !== null) {
            $metadata['reference_total_qty'] = $refTotal;
            $metadata['reference_total_at'] = now()->toIso8601String();
            $metadata['total_qty'] = $refTotal;
        }

        if (isset($row['length_m'])) {
            $metadata['length_m'] = (float) $row['length_m'];
        }

        $details = $this->clean($row['description'] ?? null);
        if ($details !== null) {
            $metadata['details'] = $details;
        }

        return $metadata === [] ? null : $metadata;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>|null
     */
    protected function buildCatalogMetadata(array $row): ?array
    {
        $metadata = is_array($row['catalog_metadata'] ?? null) ? $row['catalog_metadata'] : [];
        unset($metadata['total_qty'], $metadata['reference_total_qty'], $metadata['reference_total_at']);

        $refTotal = $this->referenceTotalFromRow($row);
        if ($refTotal !== null) {
            $metadata['reference_total_qty'] = $refTotal;
            $metadata['reference_total_at'] = now()->toIso8601String();
            $metadata['total_qty'] = $refTotal;
        }

        if (isset($row['length_m'])) {
            $metadata['length_m'] = (float) $row['length_m'];
        }

        $details = $this->clean($row['description'] ?? null);
        if ($details !== null && ! isset($metadata['details'])) {
            $metadata['details'] = $details;
        }

        return $metadata === [] ? null : $metadata;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function referenceTotalFromRow(array $row): ?float
    {
        $value = $row['reference_total_qty'] ?? $row['total_qty'] ?? null;
        if ($value === null && is_array($row['catalog_metadata'] ?? null)) {
            $value = $row['catalog_metadata']['reference_total_qty']
                ?? $row['catalog_metadata']['total_qty']
                ?? null;
        }

        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function resolveRowSku(array $row): ?string
    {
        $sku = $this->clean($row['sku'] ?? $row['code'] ?? null);
        $name = $this->clean($row['name'] ?? null);

        if ($sku === null && $name !== null) {
            $sku = strtoupper(Str::limit(Str::slug($name, '-'), 45, ''));
        }

        if ($sku === null) {
            return null;
        }

        // warehouse_items.sku is varchar(50)
        return mb_substr($sku, 0, 50);
    }

    protected function findExistingItem(?string $sku): ?Item
    {
        if ($sku === null) {
            return null;
        }

        foreach ($this->skuNormalizer->variants($sku) as $variant) {
            $item = Item::query()
                ->whereRaw('lower(sku) = ?', [mb_strtolower($variant)])
                ->first();

            if ($item !== null) {
                return $item;
            }
        }

        return null;
    }

    /**
     * @return array<string, Item> lowercase sku => item
     */
    protected function buildExistingSkuIndex(?string $catalogTier): array
    {
        $query = Item::query()->where('is_active', true);

        if ($catalogTier !== null && $catalogTier !== '') {
            $query->where(function ($builder) use ($catalogTier) {
                $builder
                    ->where('catalog_tier', $catalogTier)
                    ->orWhereNull('catalog_tier');
            });
        }

        $index = [];
        foreach ($query->get() as $item) {
            $index[mb_strtolower((string) $item->sku)] = $item;
        }

        return $index;
    }

    /**
     * @param  array<string, Item>  $index
     */
    protected function findExistingItemFromIndex(string $sku, array $index): ?Item
    {
        foreach ($this->skuNormalizer->variants($sku) as $variant) {
            $key = mb_strtolower($variant);
            if (isset($index[$key])) {
                return $index[$key];
            }
        }

        return null;
    }

    /**
     * @param  array<int, int>  $matchedItemIds
     * @return array<int, array<string, mixed>>
     */
    protected function loadDbOnlyItems(?string $catalogTier, array $matchedItemIds): array
    {
        $query = Item::query()
            ->where('is_active', true)
            ->whereNotNull('catalog_tier');

        if ($catalogTier !== null && $catalogTier !== '') {
            $query->where('catalog_tier', $catalogTier);
        }

        if ($matchedItemIds !== []) {
            $query->whereNotIn('id', $matchedItemIds);
        }

        return $query->orderBy('sku')->get()->map(fn (Item $item) => [
            'id' => $item->id,
            'sku' => $item->sku,
            'name' => $item->name,
            'catalog_tier' => $item->catalog_tier,
        ])->all();
    }

    protected function clean(?string $value): ?string
    {
        return ExcelRowUtils::clean($value);
    }
}
