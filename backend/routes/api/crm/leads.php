<?php

use App\Http\Controllers\Crm\Leads\BulkImportLeadsController;
use App\Http\Controllers\Crm\Leads\ConvertLeadController;
use App\Http\Controllers\Crm\Leads\LeadController;
use App\Http\Controllers\Crm\Leads\StoreLeadAttachmentController;
use App\Http\Controllers\Crm\Leads\UpdateLeadStatusController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:leads.view')->get('leads', [LeadController::class, 'index']);
Route::middleware('permission:leads.create')->post('leads', [LeadController::class, 'store']);
Route::middleware('permission:leads.create')->post('leads/import', BulkImportLeadsController::class);
Route::middleware('permission:leads.view')->get('leads/{lead}', [LeadController::class, 'show']);
Route::middleware('permission:leads.update')->put('leads/{lead}', [LeadController::class, 'update']);
Route::middleware('permission:leads.delete')->delete('leads/{lead}', [LeadController::class, 'destroy']);
Route::middleware('permission:leads.update')->patch('leads/{lead}/status', UpdateLeadStatusController::class);
Route::middleware('permission:leads.convert')->post('leads/{lead}/convert', ConvertLeadController::class);
Route::middleware('permission:leads.update')->post('leads/{lead}/attachments', StoreLeadAttachmentController::class);
