<?php

namespace App\Policies\Procurement;

use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class GlassOrderPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'glass_order';
}
