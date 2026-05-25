<?php

use App\Http\Controllers\Crm\Reports\CrmReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:crm.view')->group(function () {
    Route::get('reports', [CrmReportController::class, 'index']);
    Route::get('reports/{report}/export', [CrmReportController::class, 'export']);
});
