<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;
use App\Policies\Concerns\ChecksModulePermissions;

class LeadPolicy
{
    use ChecksCrmPermissions, ChecksModulePermissions;

    protected string $module = 'lead';

    public function view(User $user, Lead $lead): bool
    {
        if ($this->canViewAll($user, 'leads.view_all')) {
            return true;
        }

        if (! $this->canAny($user, ['leads.view', 'crm.view'])) {
            return false;
        }

        return $this->ownsRecord($user, $lead, [
            'lead_owner_id',
            'assigned_sales_user_id',
            'assigned_to',
            'created_by',
        ]);
    }

    public function update(User $user, Lead $lead): bool
    {
        return $this->view($user, $lead)
            && $this->canAny($user, ['leads.update', 'crm.manage']);
    }

    public function delete(User $user, Lead $lead): bool
    {
        return $this->update($user, $lead)
            && $user->can('leads.delete');
    }

    public function convert(User $user, Lead $lead): bool
    {
        return $this->view($user, $lead)
            && $this->canAny($user, ['leads.convert', 'crm.manage']);
    }
}
