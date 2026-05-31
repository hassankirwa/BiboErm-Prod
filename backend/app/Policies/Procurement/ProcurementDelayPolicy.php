<?php

namespace App\Policies\Procurement;

use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class ProcurementDelayPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'procurement_delay';
}
