<?php

namespace App\Jobs\Crm;

use App\Models\Lead;
use App\Models\User;
use App\Services\Crm\Leads\AccountProvisioningService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CreateAccountFromLead implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $leadId,
        public int $userId,
    ) {}

    public function handle(AccountProvisioningService $provisioning): void
    {
        $lead = Lead::query()->find($this->leadId);
        $user = User::query()->find($this->userId);

        if (! $lead || ! $user) {
            return;
        }

        if ($lead->converted_account_id) {
            return;
        }

        try {
            $provisioning->provisionFromLead($lead, $user);
        } catch (\Throwable $e) {
            Log::error('CreateAccountFromLead failed', [
                'lead_id' => $this->leadId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
