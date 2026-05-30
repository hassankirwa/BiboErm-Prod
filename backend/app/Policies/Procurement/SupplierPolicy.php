<?php

namespace App\Policies\Procurement;

use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class SupplierPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'supplier';
}
