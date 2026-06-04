<?php

namespace App\Events\FieldInstallation;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FieldDeliveryRecorded
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $jobId,
        public int $projectId,
        public int $deliveryRecordId,
        public int $receivedByUserId,
    ) {}
}
