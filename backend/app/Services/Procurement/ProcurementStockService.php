<?php

namespace App\Services\Procurement;

use App\Models\Warehouse\Item;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProcurementStockService
{
    public function overview(): array
    {
        $items = $this->loadItems();

        return [
            'summary' => $this->buildSummary($items),
            'status_breakdown' => $this->buildStatusBreakdown($items),
            'categories' => $this->buildCategoryBreakdown($items),
            'alerts' => $this->buildAlerts($items)->values()->all(),
            'items' => $items->values()->all(),
        ];
    }

    public function analytics(): array
    {
        $items = $this->loadItems();
        $categories = collect($this->buildCategoryBreakdown($items));
        $alerts = $this->buildAlerts($items);

        return [
            'summary' => $this->buildSummary($items),
            'status_breakdown' => $this->buildStatusBreakdown($items),
            'category_distribution' => $categories->values()->all(),
            'alert_summary' => [
                'total_alerts' => $alerts->count(),
                'low_stock_items' => $alerts->where('stock_status', 'low_stock')->count(),
                'out_of_stock_items' => $alerts->where('stock_status', 'out_of_stock')->count(),
            ],
            'top_available_items' => $items
                ->sortByDesc('quantity_available_numeric')
                ->take(5)
                ->map(fn (array $item) => $this->analyticsItemSlice($item))
                ->values()
                ->all(),
            'urgent_reorder_items' => $alerts
                ->sortByDesc(fn (array $item) => $this->alertPriority($item))
                ->take(8)
                ->map(fn (array $item) => $this->analyticsItemSlice($item))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    protected function loadItems(): Collection
    {
        return Item::query()
            ->where('is_active', true)
            ->withSum('stockLevels as total_quantity_on_hand', 'quantity_on_hand')
            ->withSum('stockLevels as total_quantity_reserved', 'quantity_reserved')
            ->withCount('stockLevels as locations_count')
            ->withMax('stockLevels as last_stock_updated_at', 'updated_at')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(function (Item $item): array {
                $quantityOnHand = $this->formatDecimal($item->total_quantity_on_hand ?? 0);
                $quantityReserved = $this->formatDecimal($item->total_quantity_reserved ?? 0);
                $quantityAvailable = bcsub($quantityOnHand, $quantityReserved, 3);
                $minStockQty = $this->formatDecimal($item->min_stock_qty ?? 0);
                $category = $item->category?->value ?? $item->getRawOriginal('category');
                $unitOfMeasure = $this->resolveDisplayUnit($item->unit_of_measure, $category);
                $stockStatus = $this->determineStockStatus($quantityAvailable, $minStockQty);
                $isAlert = $stockStatus === 'out_of_stock'
                    || ($this->hasMinimumThreshold($minStockQty) && bccomp($quantityAvailable, $minStockQty, 3) < 0);

                return [
                    'id' => $item->id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'category' => $category,
                    'category_label' => $this->categoryLabel($category),
                    'unit_of_measure' => $unitOfMeasure,
                    'min_stock_qty' => $minStockQty,
                    'quantity_on_hand' => $quantityOnHand,
                    'quantity_reserved' => $quantityReserved,
                    'quantity_available' => $quantityAvailable,
                    'stock_status' => $stockStatus,
                    'low_stock_alert' => $isAlert,
                    'locations_count' => (int) ($item->locations_count ?? 0),
                    'last_stock_updated_at' => $item->last_stock_updated_at
                        ? Carbon::parse($item->last_stock_updated_at)->toIso8601String()
                        : null,
                    'quantity_on_hand_numeric' => (float) $quantityOnHand,
                    'quantity_reserved_numeric' => (float) $quantityReserved,
                    'quantity_available_numeric' => (float) $quantityAvailable,
                    'min_stock_qty_numeric' => (float) $minStockQty,
                ];
            });
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return array<string, int|float>
     */
    protected function buildSummary(Collection $items): array
    {
        return [
            'total_materials' => $items->count(),
            'categories_count' => $items->pluck('category')->filter()->unique()->count(),
            'in_stock_items' => $items->where('stock_status', 'in_stock')->count(),
            'low_stock_items' => $items->where('stock_status', 'low_stock')->count(),
            'out_of_stock_items' => $items->where('stock_status', 'out_of_stock')->count(),
            'alert_items' => $items->where('low_stock_alert', true)->count(),
            'total_on_hand_qty' => round($items->sum('quantity_on_hand_numeric'), 3),
            'total_reserved_qty' => round($items->sum('quantity_reserved_numeric'), 3),
            'total_available_qty' => round($items->sum('quantity_available_numeric'), 3),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return list<array<string, int|string>>
     */
    protected function buildStatusBreakdown(Collection $items): array
    {
        $statuses = [
            'in_stock' => 'In Stock',
            'low_stock' => 'Low Stock',
            'out_of_stock' => 'Out of Stock',
        ];

        return collect($statuses)
            ->map(fn (string $label, string $status) => [
                'status' => $status,
                'label' => $label,
                'count' => $items->where('stock_status', $status)->count(),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return list<array<string, int|float|string>>
     */
    protected function buildCategoryBreakdown(Collection $items): array
    {
        return $items
            ->groupBy('category')
            ->map(function (Collection $group, ?string $category): array {
                return [
                    'category' => $category,
                    'label' => $this->categoryLabel($category),
                    'materials_count' => $group->count(),
                    'in_stock_items' => $group->where('stock_status', 'in_stock')->count(),
                    'low_stock_items' => $group->where('stock_status', 'low_stock')->count(),
                    'out_of_stock_items' => $group->where('stock_status', 'out_of_stock')->count(),
                    'alert_items' => $group->where('low_stock_alert', true)->count(),
                    'quantity_on_hand' => round($group->sum('quantity_on_hand_numeric'), 3),
                    'quantity_reserved' => round($group->sum('quantity_reserved_numeric'), 3),
                    'quantity_available' => round($group->sum('quantity_available_numeric'), 3),
                ];
            })
            ->sortByDesc('quantity_available')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return Collection<int, array<string, mixed>>
     */
    protected function buildAlerts(Collection $items): Collection
    {
        return $items
            ->filter(fn (array $item) => $item['low_stock_alert'] === true)
            ->map(function (array $item): array {
                $shortageQty = $item['min_stock_qty_numeric'] > 0
                    ? max(0, $item['min_stock_qty_numeric'] - $item['quantity_available_numeric'])
                    : 0;

                return [
                    ...$item,
                    'shortage_qty' => number_format($shortageQty, 3, '.', ''),
                    'shortage_qty_numeric' => round($shortageQty, 3),
                ];
            })
            ->sortByDesc(fn (array $item) => $this->alertPriority($item));
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    protected function analyticsItemSlice(array $item): array
    {
        return [
            'id' => $item['id'],
            'sku' => $item['sku'],
            'name' => $item['name'],
            'category' => $item['category'],
            'category_label' => $item['category_label'],
            'unit_of_measure' => $item['unit_of_measure'],
            'quantity_on_hand' => $item['quantity_on_hand'],
            'quantity_reserved' => $item['quantity_reserved'],
            'quantity_available' => $item['quantity_available'],
            'min_stock_qty' => $item['min_stock_qty'],
            'stock_status' => $item['stock_status'],
            'locations_count' => $item['locations_count'],
            'shortage_qty' => $item['shortage_qty'] ?? '0.000',
        ];
    }

    protected function determineStockStatus(string $availableQty, string $minStockQty): string
    {
        if (bccomp($availableQty, '0', 3) <= 0) {
            return 'out_of_stock';
        }

        if ($this->hasMinimumThreshold($minStockQty) && bccomp($availableQty, $minStockQty, 3) < 0) {
            return 'low_stock';
        }

        return 'in_stock';
    }

    protected function hasMinimumThreshold(string $minStockQty): bool
    {
        return bccomp($minStockQty, '0', 3) === 1;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    protected function alertPriority(array $item): float
    {
        return ($item['stock_status'] === 'out_of_stock' ? 1000000 : 0)
            + (float) $item['shortage_qty_numeric'];
    }

    protected function formatDecimal(mixed $value): string
    {
        return number_format((float) $value, 3, '.', '');
    }

    protected function resolveDisplayUnit(?string $unitOfMeasure, ?string $category): ?string
    {
        $normalizedUnit = $unitOfMeasure !== null ? trim($unitOfMeasure) : null;

        return match ($category) {
            'accessory' => $this->resolveAccessoryDisplayUnit($normalizedUnit),
            'aluminium_profile', 'rubber' => $this->resolveLinearDisplayUnit($normalizedUnit),
            default => $normalizedUnit !== '' ? $normalizedUnit : null,
        };
    }

    protected function resolveAccessoryDisplayUnit(?string $unitOfMeasure): string
    {
        if ($unitOfMeasure === null || $unitOfMeasure === '' || $this->isMetreUnit($unitOfMeasure)) {
            return 'each';
        }

        return $unitOfMeasure;
    }

    protected function resolveLinearDisplayUnit(?string $unitOfMeasure): string
    {
        if ($unitOfMeasure === null || $unitOfMeasure === '' || ! $this->isMetreUnit($unitOfMeasure)) {
            return 'metre';
        }

        return $unitOfMeasure;
    }

    protected function isMetreUnit(string $unitOfMeasure): bool
    {
        return in_array(strtolower(trim($unitOfMeasure)), [
            'm',
            'meter',
            'meters',
            'metre',
            'metres',
        ], true);
    }

    protected function categoryLabel(?string $category): string
    {
        if (! $category) {
            return 'Uncategorized';
        }

        $labels = [
            'accessory' => 'Accessories',
            'rubber' => 'Rubbers',
            'aluminium_profile' => 'Aluminium Profiles',
        ];

        if (array_key_exists($category, $labels)) {
            return $labels[$category];
        }

        return Str::of($category)
            ->replace('_', ' ')
            ->title()
            ->toString();
    }
}
