<?php

namespace App\Policies\Procurement;

use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class ProjectAddonRequestPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'purchase_requisition';
}
