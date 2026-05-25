<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;

class DealPaymentPolicy
{
    use ChecksCrmPermissions;

    public function create(User $user, Deal $deal): bool
    {
        return $this->canAny($user, ['deal_payments.record', 'crm.manage']);
    }

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, ['deal_payments.view', 'crm.view']);
    }
}
