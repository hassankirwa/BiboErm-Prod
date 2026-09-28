<?php

use App\Http\Controllers\Warehouse\Tools\IssueToolController;
use App\Http\Controllers\Warehouse\Tools\ReturnToolController;
use App\Http\Controllers\Warehouse\Tools\ToolController;
use App\Http\Controllers\Warehouse\Tools\ToolIncidentController;
use App\Http\Controllers\Warehouse\Tools\ToolIssuanceController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.tools.view|warehouse.tools.manage')->group(function () {
    Route::get('tools', [ToolController::class, 'index']);
    Route::get('tools/types', [ToolController::class, 'types']);
    Route::get('tools/issuances', [ToolIssuanceController::class, 'index']);
    Route::get('tools/incidents', [ToolIncidentController::class, 'index']);
});

Route::middleware('permission:warehouse.tools.manage')->group(function () {
    Route::post('tools', [ToolController::class, 'store']);
    Route::post('tools/incidents', [ToolIncidentController::class, 'store']);
    Route::patch('tools/incidents/{toolIncident}', [ToolIncidentController::class, 'update']);
});

Route::middleware('permission:warehouse.tools.issue')->post('tools/{tool}/issue', IssueToolController::class);
Route::middleware('permission:warehouse.tools.issue')->post('tools/issuances/{issuance}/return', ReturnToolController::class);
