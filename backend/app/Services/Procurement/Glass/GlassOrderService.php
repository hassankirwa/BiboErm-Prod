<?php

namespace App\Services\Procurement\Glass;

use App\Enums\Procurement\GlassOrderStatus;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\GlassPriceRecord;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use App\Services\Procurement\Requisitions\RequisitionSourceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GlassOrderService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
        protected RequisitionSourceService $requisitionSources,
    ) {}

    public function create(User $user, array $data): GlassOrder
    {
        $specs = $data['specs'] ?? $this->specsFromProject((int) $data['project_id']);

        $order = GlassOrder::query()->create([
            'order_number' => $this->refs->glassOrder(),
            'project_id' => $data['project_id'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'purchase_order_id' => $data['purchase_order_id'] ?? null,
            'specs' => $specs,
            'status' => GlassOrderStatus::Draft,
            'expected_delivery' => $data['expected_delivery'] ?? null,
            'delivery_location' => $data['delivery_location'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        $this->audit->log('glass_order.created', $order);

        return $order->load(['project', 'supplier']);
    }

    public function markOrdered(GlassOrder $order, User $user): GlassOrder
    {
        if ($order->status !== GlassOrderStatus::Draft) {
            throw ValidationException::withMessages(['status' => ['Only draft glass orders can be marked ordered.']]);
        }

        $this->assertReadyForOrder($order);

        return DB::transaction(function () use ($order, $user) {
            $specs = is_array($order->specs) ? $order->specs : [];
            if (trim((string) ($specs['requirements'] ?? '')) === '') {
                $composed = $this->composeRequirementsFromPanes($specs['panes'] ?? []);
                if ($composed !== '') {
                    $specs['requirements'] = $composed;
                    $order->update(['specs' => $specs]);
                }
            }

            $order->update([
                'status' => GlassOrderStatus::Ordered,
                'ordered_at' => now(),
            ]);

            $requisition = $this->requisitionSources->createFromGlassOrder($user, $order->fresh());

            $this->audit->log('glass_order.ordered', $order, null, [
                'purchase_requisition_id' => $requisition->id,
                'purchase_requisition_reference' => $requisition->reference,
            ]);

            return $order->fresh(['project', 'supplier', 'purchaseRequisition']);
        });
    }

    /**
     * @param  list<array{unit_buying_price: float|int|string}>  $panePrices
     */
    public function markDelivered(GlassOrder $order, array $panePrices = [], string $currency = 'KES'): GlassOrder
    {
        if (! in_array($order->status, [GlassOrderStatus::Ordered, GlassOrderStatus::InTransit], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only ordered or in-transit glass orders can be marked delivered.'],
            ]);
        }

        return DB::transaction(function () use ($order, $panePrices, $currency) {
            $specs = is_array($order->specs) ? $order->specs : [];
            $panes = is_array($specs['panes'] ?? null) ? $specs['panes'] : [];

            if ($panes === []) {
                throw ValidationException::withMessages([
                    'panes' => ['Glass order has no panes to price on delivery.'],
                ]);
            }

            if (count($panePrices) !== count($panes)) {
                throw ValidationException::withMessages([
                    'panes' => ['Provide a unit buying price for every glass component (pane) on this order.'],
                ]);
            }

            $pricedPanes = [];
            $totalCost = 0.0;
            $totalArea = 0.0;
            $recordedAt = now();

            foreach ($panes as $index => $pane) {
                if (! is_array($pane)) {
                    throw ValidationException::withMessages([
                        "panes.{$index}" => ['Invalid pane data.'],
                    ]);
                }

                $width = $pane['width_mm'] ?? null;
                $height = $pane['height_mm'] ?? null;
                $quantity = $pane['quantity'] ?? null;
                $unitBuyingPrice = $panePrices[$index]['unit_buying_price'] ?? null;

                if (! is_numeric($width) || (float) $width <= 0
                    || ! is_numeric($height) || (float) $height <= 0
                    || ! is_numeric($quantity) || (float) $quantity <= 0) {
                    throw ValidationException::withMessages([
                        "panes.{$index}" => ['Each pane needs valid width, height, and quantity before delivery pricing.'],
                    ]);
                }

                if (! is_numeric($unitBuyingPrice) || (float) $unitBuyingPrice < 0) {
                    throw ValidationException::withMessages([
                        "panes.{$index}.unit_buying_price" => ['Enter a unit buying price of 0 or greater for each glass component.'],
                    ]);
                }

                $qty = (float) $quantity;
                $unitPrice = round((float) $unitBuyingPrice, 2);
                $lineTotal = round($unitPrice * $qty, 2);
                $areaM2 = GlassAreaCalculator::areaM2($width, $height, $qty);
                $pricePerSqm = GlassAreaCalculator::pricePerSqm($lineTotal, $areaM2);

                if ($pricePerSqm === null) {
                    throw ValidationException::withMessages([
                        "panes.{$index}.unit_buying_price" => ['Unable to compute price per m² for this pane.'],
                    ]);
                }

                $pricedPane = array_merge($pane, [
                    'unit_buying_price' => $unitPrice,
                    'buying_price' => $lineTotal,
                    'area_m2' => $areaM2,
                    'price_per_sqm' => $pricePerSqm,
                    'currency' => $currency,
                ]);
                $pricedPanes[] = $pricedPane;

                $totalCost += $lineTotal;
                $totalArea += $areaM2;

                GlassPriceRecord::query()->create([
                    'glass_order_id' => $order->id,
                    'project_id' => $order->project_id,
                    'supplier_id' => $order->supplier_id,
                    'pane_index' => $index,
                    'pane_name' => $pane['name'] ?? null,
                    'glass_type' => $pane['glass_type'] ?? null,
                    'tint' => $pane['tint'] ?? null,
                    'width_mm' => (float) $width,
                    'height_mm' => (float) $height,
                    'quantity' => $qty,
                    'area_m2' => $areaM2,
                    'buying_price' => $lineTotal,
                    'price_per_sqm' => $pricePerSqm,
                    'currency' => $currency,
                    'recorded_at' => $recordedAt,
                ]);
            }

            $specs['panes'] = $pricedPanes;

            $order->update([
                'status' => GlassOrderStatus::Delivered,
                'delivered_at' => $recordedAt,
                'specs' => $specs,
                'total_cost' => round($totalCost, 2),
                'total_area_m2' => round($totalArea, 4),
                'currency' => $currency,
            ]);

            $this->audit->log('glass_order.delivered', $order, null, [
                'total_cost' => round($totalCost, 2),
                'total_area_m2' => round($totalArea, 4),
                'currency' => $currency,
            ]);

            return $order->fresh(['project', 'supplier', 'priceRecords']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function specsFromProject(int $projectId): array
    {
        $bomIds = ProjectBom::query()
            ->where('project_id', $projectId)
            ->pluck('id');

        if ($bomIds->isEmpty()) {
            return [
                'source' => 'project_bom',
                'requirements' => '',
                'panes' => [],
            ];
        }

        $panes = ProjectBomLine::query()
            ->whereIn('bom_id', $bomIds)
            ->where(function ($query) {
                $query->where('is_glass', true)
                    ->orWhere('line_type', 'glass');
            })
            ->orderBy('id')
            ->get()
            ->map(fn (ProjectBomLine $line) => [
                'name' => $line->material_name,
                'width_mm' => $line->width_mm !== null ? (float) $line->width_mm : null,
                'height_mm' => $line->height_mm !== null ? (float) $line->height_mm : null,
                'quantity' => (float) $line->quantity,
                'glass_type' => $line->material_code,
                'notes' => $line->notes,
                'bom_line_id' => $line->id,
            ])
            ->values()
            ->all();

        return [
            'source' => 'project_bom',
            'requirements' => '',
            'panes' => $panes,
        ];
    }

    public function assertReadyForOrder(GlassOrder $order): void
    {
        $errors = [];

        if (! $order->supplier_id) {
            $errors['supplier_id'] = ['Select a glass supplier before marking as ordered.'];
        }

        $specs = is_array($order->specs) ? $order->specs : [];
        $panes = $specs['panes'] ?? [];
        $requirements = trim((string) ($specs['requirements'] ?? ''));

        if ($requirements === '' && ! $this->panesHaveTypeAndTint($panes)) {
            $errors['specs.requirements'] = [
                'Enter glass requirements, or set type and tint on every pane before ordering.',
            ];
        }

        if (! $this->hasValidPaneDimensions($panes)) {
            $errors['specs.panes'] = ['Add at least one pane with width, height, and quantity.'];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * @param  array<int, mixed>|mixed  $panes
     */
    protected function hasValidPaneDimensions(mixed $panes): bool
    {
        if (! is_array($panes)) {
            return false;
        }

        return collect($panes)->contains(function ($pane) {
            return $this->paneHasDimensions($pane);
        });
    }

    /**
     * Dimensioned panes must each carry type + tint when free-text requirements are blank.
     *
     * @param  array<int, mixed>|mixed  $panes
     */
    protected function panesHaveTypeAndTint(mixed $panes): bool
    {
        if (! is_array($panes)) {
            return false;
        }

        $dimensioned = collect($panes)->filter(fn ($pane) => $this->paneHasDimensions($pane));

        if ($dimensioned->isEmpty()) {
            return false;
        }

        return $dimensioned->every(function ($pane) {
            if (! is_array($pane)) {
                return false;
            }

            return trim((string) ($pane['glass_type'] ?? '')) !== ''
                && trim((string) ($pane['tint'] ?? '')) !== '';
        });
    }

    /**
     * @param  array<int, mixed>|mixed  $panes
     */
    protected function composeRequirementsFromPanes(mixed $panes): string
    {
        if (! is_array($panes)) {
            return '';
        }

        $parts = [];

        foreach ($panes as $pane) {
            if (! is_array($pane) || ! $this->paneHasDimensions($pane)) {
                continue;
            }

            $type = trim((string) ($pane['glass_type'] ?? ''));
            $tint = trim((string) ($pane['tint'] ?? ''));
            if ($type === '' && $tint === '') {
                continue;
            }

            $name = trim((string) ($pane['name'] ?? 'Glass'));
            $label = trim($type.($type !== '' && $tint !== '' ? ' / ' : '').$tint);
            $parts[] = $name !== '' ? "{$name}: {$label}" : $label;
        }

        return implode('; ', array_unique($parts));
    }

    protected function paneHasDimensions(mixed $pane): bool
    {
        if (! is_array($pane)) {
            return false;
        }

        $width = $pane['width_mm'] ?? null;
        $height = $pane['height_mm'] ?? null;
        $quantity = $pane['quantity'] ?? null;

        return is_numeric($width) && (float) $width > 0
            && is_numeric($height) && (float) $height > 0
            && is_numeric($quantity) && (float) $quantity > 0;
    }
}
