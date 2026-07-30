<?php

namespace App\Listeners\QualityControl;

use App\Events\FieldInstallation\FieldDeliveryRecorded;
use App\Services\QualityControl\QcInspectionService;

/**
 * Auto-creates a site_receiving inspection when materials are received on site.
 */
class CreateSiteReceivingInspectionOnDelivery
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(FieldDeliveryRecorded $event): void
    {
        $this->inspections->createSiteReceiving(
            $event->projectId,
            $event->jobId,
            $event->deliveryRecordId,
        );
    }
}
