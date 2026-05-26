<?php

namespace App\Policies;

use App\Models\FieldDayPin;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;

class FieldDayPinPolicy
{
    use ChecksCrmPermissions;

    public function view(User $user, FieldDayPin $pin): bool
    {
        $pin->loadMissing('fieldDay');

        return app(FieldDayPolicy::class)->view($user, $pin->fieldDay);
    }

    public function convertToLead(User $user, FieldDayPin $pin): bool
    {
        if (! $this->canAny($user, ['leads.create', 'crm.manage'])) {
            return false;
        }

        $pin->loadMissing('fieldDay');

        return app(FieldDayPolicy::class)->update($user, $pin->fieldDay);
    }
}
