<?php

namespace App\Services\Warehouse\MasterData;

use App\Models\Warehouse\Item;
use App\Models\Warehouse\ItemAlias;
use Illuminate\Support\Str;

class WarehouseItemResolver
{
    public function __construct(
        protected SkuNormalizer $skuNormalizer,
    ) {}

    public function resolve(
        ?string $code,
        ?string $name,
        ?string $sourceSystem = 'wincad',
        ?string $series = null,
        ?string $lineType = null,
    ): ?int {
        $code = $this->clean($code);
        $name = $this->clean($name);

        foreach ($this->skuNormalizer->variants($code) as $variant) {
            $itemId = Item::query()
                ->where('is_active', true)
                ->whereRaw('lower(sku) = ?', [mb_strtolower($variant)])
                ->value('id');

            if ($itemId) {
                return (int) $itemId;
            }
        }

        $alias = $this->aliasQuery($sourceSystem, $code, $name, $series, $lineType)->first();
        if ($alias) {
            return (int) $alias->warehouse_item_id;
        }

        foreach ($this->skuNormalizer->variants($code) as $variant) {
            $alias = $this->aliasQuery($sourceSystem, $variant, $name, $series, $lineType)->first();
            if ($alias) {
                return (int) $alias->warehouse_item_id;
            }
        }

        if ($name !== null) {
            $itemId = Item::query()
                ->where('is_active', true)
                ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
                ->value('id');

            if ($itemId) {
                return (int) $itemId;
            }

            $mapped = FabricationHardwareAliasMap::resolve($name);
            if ($mapped !== null) {
                $itemId = Item::query()
                    ->where('is_active', true)
                    ->whereRaw('lower(sku) = ?', [mb_strtolower($mapped['sku'])])
                    ->value('id');

                if ($itemId) {
                    return (int) $itemId;
                }
            }
        }

        return null;
    }

    public function persistAlias(
        int $warehouseItemId,
        ?string $sourceSystem,
        ?string $sourceCode,
        ?string $sourceName,
        ?string $series = null,
        ?string $lineType = null,
        int $confidence = 100,
    ): void {
        $sourceSystem = $this->clean($sourceSystem) ?? 'wincad';
        $sourceCode = $this->clean($sourceCode);
        $sourceName = $this->clean($sourceName);

        if ($sourceName === null && $sourceCode === null) {
            return;
        }

        ItemAlias::query()->updateOrCreate(
            [
                'source_system' => $sourceSystem,
                'source_code' => $sourceCode,
                'source_name' => $sourceName ?? $sourceCode,
                'series' => $this->clean($series),
                'line_type' => $this->clean($lineType),
            ],
            [
                'warehouse_item_id' => $warehouseItemId,
                'confidence' => max(0, min(100, $confidence)),
                'is_active' => true,
            ],
        );
    }

    /**
     * @return array<int, string>
     */
    public function persistSkuVariantAliases(
        int $warehouseItemId,
        string $canonicalSku,
        ?string $sourceSystem = 'catalog',
        ?string $series = null,
        ?string $lineType = null,
    ): void {
        foreach ($this->skuNormalizer->variants($canonicalSku) as $variant) {
            if (strcasecmp($variant, $canonicalSku) === 0) {
                continue;
            }

            $this->persistAlias(
                warehouseItemId: $warehouseItemId,
                sourceSystem: $sourceSystem,
                sourceCode: $variant,
                sourceName: $variant,
                series: $series,
                lineType: $lineType,
                confidence: 95,
            );
        }
    }

    protected function aliasQuery(
        ?string $sourceSystem,
        ?string $code,
        ?string $name,
        ?string $series,
        ?string $lineType,
    ) {
        $query = ItemAlias::query()
            ->where('is_active', true)
            ->where('source_system', $sourceSystem ?: 'wincad')
            ->orderByDesc('confidence')
            ->orderByRaw('series is not null desc')
            ->orderByDesc('id');

        if ($lineType !== null) {
            $query->where(function ($q) use ($lineType) {
                $q->whereNull('line_type')->orWhere('line_type', $lineType);
            });
        }

        if ($series !== null) {
            $query->where(function ($q) use ($series) {
                $q->whereNull('series')->orWhere('series', $series);
            });
        }

        $codeVariants = $this->skuNormalizer->variants($code);

        return $query->where(function ($q) use ($code, $codeVariants, $name) {
            foreach ($codeVariants as $variant) {
                $q->orWhereRaw('lower(source_code) = ?', [mb_strtolower($variant)]);
            }

            if ($name !== null) {
                $q->orWhereRaw('lower(source_name) = ?', [mb_strtolower($name)]);
                $q->orWhereRaw('lower(source_name) = ?', [mb_strtolower(Str::squish($name))]);
            }
        });
    }

    protected function clean(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = Str::squish(trim($value));

        return $value === '' ? null : $value;
    }
}
