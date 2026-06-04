<?php

namespace App\Listeners\QualityControl;

use App\Services\QualityControl\QcInspectionService;

/**
 * Auto-creates a warehouse_receiving inspection when a GRN enters verifying status.
 * Register when a procurement GRN pending/verifying event is available.
 */
class CreateReceivingInspectionOnGrnPending
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(int $goodsReceiptId, ?int $projectId = null): void
    {
        $this->inspections->createReceivingInspection($goodsReceiptId, $projectId);
    }
}
