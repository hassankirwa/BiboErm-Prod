<?php

namespace App\Services\Production;

use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CuttingSheetService
{
    public function __construct(
        protected ProductionAuditLogger $audit,
    ) {}

    /**
     * @param  array{cut_length_mm?: int, pieces?: int, bar_length_mm?: int|null, waste_mm?: int|null, reason: string}  $data
     */
    public function updateLine(
        ProductionOrder $order,
        CuttingSheet $line,
        User $user,
        array $data,
    ): CuttingSheet {
        if ($line->production_order_id !== $order->id) {
            throw ValidationException::withMessages([
                'line' => ['Cutting sheet line does not belong to this production order.'],
            ]);
        }

        $old = $line->only(['cut_length_mm', 'pieces', 'bar_length_mm', 'waste_mm']);

        $line->fill(array_intersect_key($data, array_flip([
            'cut_length_mm',
            'pieces',
            'bar_length_mm',
            'waste_mm',
        ])));
        $line->save();

        $this->audit->cuttingSheetLineUpdated($line, $old, [
            'reason' => $data['reason'],
            'updated_by' => $user->id,
        ]);

        return $line->fresh();
    }
}
