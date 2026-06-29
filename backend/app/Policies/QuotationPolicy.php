<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;

class QuotationPolicy
{
    use ChecksCrmPermissions;

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, ['quotations.view', 'crm.view']);
    }

    public function view(User $user, Quotation $quotation): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->canAny($user, ['quotations.create', 'crm.manage']);
    }

    public function approve(User $user, Quotation $quotation): bool
    {
        return $this->canAny($user, [
            'quotations.approve',
            'quotations.send',
            'crm.manage',
        ]) || $this->hasLegacyCrmAccess($user);
    }

    public function send(User $user, Quotation $quotation): bool
    {
        return $this->canAny($user, [
            'quotations.send',
            'quotations.approve',
            'crm.manage',
        ]) || $this->hasLegacyCrmAccess($user);
    }

    public function accept(User $user, Quotation $quotation): bool
    {
        return $this->canAny($user, ['deals.update', 'quotations.approve', 'crm.manage']);
    }
}
