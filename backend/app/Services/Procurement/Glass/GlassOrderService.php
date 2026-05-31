<?php

namespace App\Services\Procurement\Glass;

use App\Enums\Procurement\GlassOrderStatus;
use App\Models\Procurement\GlassOrder;
use App\Models\User;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Validation\ValidationException;

class GlassOrderService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
    ) {}

    public function create(User $user, array $data): GlassOrder
    {
        $order = GlassOrder::query()->create([
            'order_number' => $this->refs->glassOrder(),
            'project_id' => $data['project_id'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'purchase_order_id' => $data['purchase_order_id'] ?? null,
            'specs' => $data['specs'] ?? [],
            'status' => GlassOrderStatus::Draft,
            'expected_delivery' => $data['expected_delivery'] ?? null,
            'delivery_location' => $data['delivery_location'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        $this->audit->log('glass_order.created', $order);

        return $order->load(['project', 'supplier']);
    }

    public function markOrdered(GlassOrder $order): GlassOrder
    {
        if ($order->status !== GlassOrderStatus::Draft) {
            throw ValidationException::withMessages(['status' => ['Only draft glass orders can be marked ordered.']]);
        }

        $order->update([
            'status' => GlassOrderStatus::Ordered,
            'ordered_at' => now(),
        ]);

        return $order->fresh(['project', 'supplier']);
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
}
