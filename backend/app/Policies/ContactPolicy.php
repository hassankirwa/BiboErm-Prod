<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;
use App\Policies\Concerns\ChecksModulePermissions;

class ContactPolicy
{
    use ChecksCrmPermissions, ChecksModulePermissions;

    protected string $module = 'contact';

    public function view(User $user, Contact $contact): bool
    {
        if ($this->canViewAll($user, 'contacts.view_all')) {
            return true;
        }

        if (! $this->canAny($user, ['contacts.view', 'crm.view'])) {
            return false;
        }

        return $this->ownsRecord($user, $contact, [
            'contact_owner_id',
            'owner_id',
            'created_by',
        ]);
    }

    public function update(User $user, Contact $contact): bool
    {
        return $this->view($user, $contact)
            && $this->canAny($user, ['contacts.update', 'crm.manage']);
    }
}
