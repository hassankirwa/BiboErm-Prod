<?php

use App\Http\Controllers\Crm\CrmHomeSummaryController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:crm.view')->get('home-summary', CrmHomeSummaryController::class);
