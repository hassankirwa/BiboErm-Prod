<?php

namespace App\Services\Procurement\Requisitions;

use App\Enums\Procurement\RequisitionTrigger;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\User;
use App\Models\Warehouse\Item;
use Illuminate\Validation\ValidationException;

class AutoDraftRequisitionService
{
    public function __construct(
        protected PurchaseRequisitionService $requisitions,
    ) {}

    public function fromShortage(ProjectMaterialShortageDetected $event): PurchaseRequisition
    {
        $user = User::query()->first();
        if (! $user) {
            throw ValidationException::withMessages(['user' => ['No system user for auto-draft.']]);
        }

        $lines = [];
        foreach ($event->shortageLines as $shortage) {
            $item = Item::query()->find($shortage['warehouse_item_id']);
            $lines[] = [
                'warehouse_item_id' => $shortage['warehouse_item_id'],
                'project_bom_line_id' => $shortage['project_bom_line_id'] ?? null,
                'description' => $item?->name ?? 'Material shortage',
                'sku' => $item?->sku,
                'quantity' => $shortage['qty_short'],
                'unit_of_measure' => $item?->unit_of_measure,
                'trigger_type' => RequisitionTrigger::BomShortage->value,
            ];
        }

        return $this->requisitions->createDraft(
            user: $user,
            data: [
                'project_id' => $event->projectId,
                'notes' => 'Auto-drafted from material shortage',
                'lines' => $lines,
            ],
            defaultTrigger: RequisitionTrigger::BomShortage,
        );
    }
}
