<?php

use App\Http\Controllers\Crm\Lookups\CrmLookupController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:crm.view')->group(function () {
    Route::get('lookups', [CrmLookupController::class, 'index']);
    Route::get('lookups/users', [CrmLookupController::class, 'users']);
});
