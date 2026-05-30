<?php

namespace App\Policies\Procurement;

use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class ProcurementProjectWatcherPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'procurement_watcher';
}
