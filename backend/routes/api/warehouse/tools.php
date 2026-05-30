<?php

use App\Http\Controllers\Warehouse\Tools\IssueToolController;
use App\Http\Controllers\Warehouse\Tools\ReturnToolController;
use App\Http\Controllers\Warehouse\Tools\ToolController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.tools.view|warehouse.tools.manage')->get('tools', [ToolController::class, 'index']);
Route::middleware('permission:warehouse.tools.manage')->post('tools', [ToolController::class, 'store']);
Route::middleware('permission:warehouse.tools.issue')->post('tools/{tool}/issue', IssueToolController::class);
Route::middleware('permission:warehouse.tools.issue')->post('tools/issuances/{issuance}/return', ReturnToolController::class);
