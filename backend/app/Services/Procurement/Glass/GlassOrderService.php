<?php

namespace App\Services\Procurement\Glass;

use App\Enums\Procurement\GlassOrderStatus;
use App\Models\Procurement\GlassOrder;
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

    public function markDelivered(GlassOrder $order): GlassOrder
    {
        $order->update([
            'status' => GlassOrderStatus::Delivered,
            'delivered_at' => now(),
        ]);

        $this->audit->log('glass_order.delivered', $order);

        return $order->fresh(['project', 'supplier']);
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
                'width_mm' => $line->measurement_mm,
                'height_mm' => null,
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
        $requirements = trim((string) ($specs['requirements'] ?? ''));

        if ($requirements === '') {
            $errors['specs.requirements'] = ['Enter glass requirements (type, tint, processing) before ordering.'];
        }

        if (! $this->hasValidPaneDimensions($specs['panes'] ?? [])) {
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
            if (! is_array($pane)) {
                return false;
            }

            $width = $pane['width_mm'] ?? null;
            $height = $pane['height_mm'] ?? null;
            $quantity = $pane['quantity'] ?? null;

            return is_numeric($width) && (float) $width > 0
                && is_numeric($height) && (float) $height > 0
                && is_numeric($quantity) && (float) $quantity > 0;
        });
    }
}
