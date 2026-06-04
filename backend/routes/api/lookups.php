<?php

use App\Http\Controllers\Lookups\AssignableUserLookupController;
use Illuminate\Support\Facades\Route;

Route::middleware(
    'role_or_permission:users.view|users.manage|production.view|production.manage|production.schedule.manage|warehouse.tools.view|warehouse.tools.manage|warehouse.tools.issue'
)->get('assignable-users', AssignableUserLookupController::class);
