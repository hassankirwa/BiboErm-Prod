<?php

namespace App\Services\Production;

use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use App\Services\Warehouse\Reservations\AluminiumBarDemandService;
use Illuminate\Validation\ValidationException;

class CuttingSheetService
{
    public function __construct(
        protected ProductionAuditLogger $audit,
        protected AluminiumBarDemandService $barDemand,
    ) {}

    /**
     * @param  array{cut_length_mm?: int, pieces?: int, bar_length_mm?: int|null, waste_mm?: int|null, reason?: string|null}  $data
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

        $this->assertBarFitsCuts($line);
        $line->save();

        $this->audit->cuttingSheetLineUpdated($line, $old, [
            'reason' => filled($data['reason'] ?? null) ? trim((string) $data['reason']) : null,
            'updated_by' => $user->id,
        ]);

        return $line->fresh(['warehouseItem.aluminiumProfile']);
    }

    public function expectedBarLengthMm(CuttingSheet $line): int
    {
        $line->loadMissing('warehouseItem.aluminiumProfile');
        $item = $line->warehouseItem;
        if (! $item) {
            return AluminiumBarDemandService::DEFAULT_BAR_LENGTH_MM;
        }

        return $this->barDemand->barLengthMm($item);
    }

    /**
     * Planned cuts and the recorded remnant must fit within the physical bar.
     */
    public function assertBarFitsCuts(CuttingSheet $line): void
    {
        $bar = $line->bar_length_mm;
        if ($bar === null) {
            return;
        }

        $barMm = (int) $bar;
        $cutMm = $line->planned_used_mm ?? $this->plannedUsedMm($line);

        if ($cutMm > $barMm) {
            throw ValidationException::withMessages([
                'bar_length_mm' => [
                    "Planned cuts ({$cutMm} mm) cannot exceed bar length ({$barMm} mm).",
                ],
            ]);
        }

        if ($line->waste_mm !== null && $cutMm + (int) $line->waste_mm > $barMm) {
            throw ValidationException::withMessages([
                'waste_mm' => [
                    "Planned cuts ({$cutMm} mm) plus waste ({$line->waste_mm} mm) exceed bar length ({$barMm} mm).",
                ],
            ]);
        }
    }

    private function plannedUsedMm(CuttingSheet $line): int
    {
        if (is_array($line->cuts) && $line->cuts !== []) {
            return array_sum(array_map(
                fn (array $cut) => (int) ($cut['length_mm'] ?? 0),
                $line->cuts,
            ));
        }

        return (int) $line->cut_length_mm * (int) $line->pieces;
    }
}
