<?php

namespace App\Policies\Procurement;

use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class TransportOrderPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'transport_order';
}
