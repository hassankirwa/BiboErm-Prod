<?php

namespace App\Policies\Procurement;

use App\Policies\Concerns\ChecksModulePermissions;

class DriverPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'driver';
}
