<?php

use App\Http\Controllers\Crm\Lookups\CrmLookupController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:leads.view,deals.view,crm.view')->get('lookups', [CrmLookupController::class, 'index']);
