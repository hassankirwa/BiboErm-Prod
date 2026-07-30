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
use App\Services\Excel\Structure\MaterialClassifier;
use Illuminate\Support\Str;

class MaterialMasterSyncService
{
    public function __construct(
        protected MaterialClassifier $classifier,
    ) {}

    /**
     * @return array{items: array<int, array<string, mixed>>, counts: array{new: int, changed: int, unchanged: int}}
     */
    public function previewItems(array $items): array
    {
        $existing = Item::query()->get()->keyBy(
            fn (Item $item) => $this->normalizeCode((string) $item->sku)
        );
        $counts = ['new' => 0, 'changed' => 0, 'unchanged' => 0];

        $items = array_map(function (array $row) use ($existing, &$counts) {
            $stored = $existing->get($this->normalizeCode((string) ($row['code'] ?? '')));
            if (! $stored) {
                $row['_sync_status'] = 'new';
                $row['_changed_fields'] = [];
                $counts['new']++;
                return $row;
            }

            $metadata = is_array($stored->catalog_metadata) ? $stored->catalog_metadata : [];
            $changedFields = [];
            if ($stored->name !== ($row['description'] ?? $row['code'] ?? '')) {
                $changedFields[] = 'name';
            }
            if ($stored->description !== ($row['description'] ?? null)) {
                $changedFields[] = 'description';
            }
            if (($metadata['default_bin_id'] ?? null) !== ($row['bin_id'] ?? null)) {
                $changedFields[] = 'bin';
            }
            if (! $stored->image_path && ! empty($row['image_path'])) {
                $changedFields[] = 'image';
            }

            $status = $changedFields === [] ? 'unchanged' : 'changed';
            $row['_sync_status'] = $status;
            $row['_changed_fields'] = $changedFields;
            $counts[$status]++;

            return $row;
        }, $items);

        return compact('items', 'counts');
    }

    public function syncItems(array $items): array
    {
        $added = 0;
        $updated = 0;
        $unchanged = 0;
        $mapped = 0;
        $unmapped = 0;
        $generalDoorTypeId = DoorType::query()->where('code', 'GEN')->value('id') ?? DoorType::query()->value('id');

        foreach ($items as $row) {
            $code = trim((string) ($row['code'] ?? ''));
            if ($code === '') {
                continue;
            }
            $description = trim((string) ($row['description'] ?? '')) ?: $code;
            $normalized = $this->normalizeCode($code);
            $mappedCode = BinCatalogCode::query()->with('bin.section')->where('normalized_code', $normalized)->first();
            $defaultBinId = isset($row['bin_id']) && is_numeric($row['bin_id'])
                ? (int) $row['bin_id']
                : $mappedCode?->bin_id;
            $defaultBin = $defaultBinId
                ? Bin::query()
                    ->with('section')
                    ->whereKey($defaultBinId)
                    ->whereHas('section', fn ($query) => $query->whereIn(
                        'code',
                        array_values(BinCatalogExcelService::FILE_TO_SECTION),
                    ))
                    ->first()
                : null;
            $defaultBinId = $defaultBin?->id;
            $sectionCode = $defaultBin?->section?->code ?? $mappedCode?->bin?->section?->code;
            $category = $this->resolveCategory($code, $description, $sectionCode);

            $item = Item::query()->where('sku', $code)->first();
            $payload = [
                'name' => $description,
                'category' => $category,
                'description' => $description,
                'unit_of_measure' => $this->classifier->defaultUnit($category),
                'is_active' => true,
                'catalog_tier' => null,
                'image_path' => $mappedCode?->image_path ?? $item?->image_path,
                'catalog_metadata' => array_filter([
                    'material_master' => true,
                    'default_bin_id' => $defaultBinId,
                    'bin_mapping_method' => $row['mapping_method'] ?? ($mappedCode ? 'exact_code' : 'unmapped'),
                    'bin_mapping_confidence' => $row['mapping_confidence'] ?? ($mappedCode ? 1 : 0),
                    'bin_section_code' => $sectionCode,
                    'catalog_description' => $mappedCode?->source_description,
                ], fn ($value) => $value !== null),
                'door_type_id' => $category === ItemCategory::Accessory->value ? $generalDoorTypeId : null,
            ];

            if (! $item) {
                $item = Item::query()->create(array_merge($payload, [
                    'sku' => $code,
                    'min_stock_qty' => 0,
                ]));
                $added++;
            } else {
                $changed = false;
                foreach ($payload as $key => $value) {
                    if ($item->{$key} !== $value) {
                        $item->{$key} = $value;
                        $changed = true;
                    }
                }
                if ($changed) {
                    $item->save();
                    $updated++;
                } else {
                    $unchanged++;
                }
            }

            $this->syncCategoryExtensions($item, $category, $generalDoorTypeId, $defaultBinId, $defaultBin?->section_id);
            $defaultBinId ? $mapped++ : $unmapped++;
        }

        return compact('added', 'updated', 'unchanged', 'mapped', 'unmapped');
    }

    protected function syncCategoryExtensions(
        Item $item,
        string $category,
        ?int $generalDoorTypeId,
        ?int $defaultBinId,
        ?int $defaultSectionId,
    ): void {
        if ($category === ItemCategory::AluminiumProfile->value) {
            $existing = AluminiumProfile::query()->where('item_id', $item->id)->first();
            AluminiumProfile::query()->updateOrCreate(
                ['item_id' => $item->id],
                [
                    'profile_family' => $existing?->profile_family ?: 'Catalog',
                    'default_bin_id' => $defaultBinId ?? $existing?->default_bin_id,
                ]
            );
            $this->clearOtherExtensions($item->id, keep: 'aluminium');

            return;
        }

        if ($category === ItemCategory::Accessory->value) {
            $existing = Accessory::query()->where('item_id', $item->id)->first();
            Accessory::query()->updateOrCreate(
                ['item_id' => $item->id],
                [
                    'door_type_id' => $generalDoorTypeId ?? $existing?->door_type_id,
                    'default_bin_id' => $defaultBinId ?? $existing?->default_bin_id,
                ]
            );
            $this->clearOtherExtensions($item->id, keep: 'accessory');

            return;
        }

        $existing = Rubber::query()->where('item_id', $item->id)->first();
        Rubber::query()->updateOrCreate(
            ['item_id' => $item->id],
            [
                'compatible_profile_ids' => $existing?->compatible_profile_ids,
                'default_section_id' => $defaultSectionId ?? $existing?->default_section_id,
            ]
        );
        $this->clearOtherExtensions($item->id, keep: 'rubber');
    }

    protected function clearOtherExtensions(int $itemId, string $keep): void
    {
        if ($keep !== 'aluminium') {
            AluminiumProfile::query()->where('item_id', $itemId)->delete();
        }
        if ($keep !== 'accessory') {
            Accessory::query()->where('item_id', $itemId)->delete();
        }
        if ($keep !== 'rubber') {
            Rubber::query()->where('item_id', $itemId)->delete();
        }
    }

    protected function resolveCategory(string $code, string $description, ?string $sectionCode): string
    {
        $catalogTier = match ($sectionCode) {
            'SEC-ALU-PREMIUM' => 'premium',
            'SEC-ALU-STANDARD' => 'standard',
            'SEC-ALU-BALUSTRADE' => 'balustrade',
            'SEC-ALU-SPECIALTY' => 'specialty',
            default => null,
        };

        $hasMappedBin = $catalogTier !== null;

        return $this->classifier->classifyForCatalog(
            null,
            $description,
            $sectionCode,
            $catalogTier,
            false,
            $description,
            $code,
            hasProfileTableContext: $hasMappedBin && $catalogTier !== 'balustrade'
        );
    }

    protected function normalizeCode(string $code): string
    {
        return Str::upper(preg_replace('/[\s_\-]+/', '', trim($code)) ?? trim($code));
    }
}
