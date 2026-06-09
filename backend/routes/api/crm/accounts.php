<?php

use App\Http\Controllers\Crm\Accounts\AccountController;
use App\Http\Controllers\Crm\Accounts\AccountDocumentController;
use App\Http\Controllers\Crm\Quotations\AccountQuotationController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:accounts.view')->get('accounts', [AccountController::class, 'index']);
Route::middleware('permission:accounts.create')->post('accounts', [AccountController::class, 'store']);
Route::middleware('permission:accounts.view')->get('accounts/{account}', [AccountController::class, 'show']);
Route::middleware('permission:accounts.update')->put('accounts/{account}', [AccountController::class, 'update']);
Route::middleware('permission:deals.view')->get('accounts/{account}/deals', [AccountController::class, 'deals']);
Route::middleware('permission:accounts.view')->get('accounts/{account}/documents', [AccountDocumentController::class, 'index']);
Route::middleware('permission:accounts.update')->post('accounts/{account}/documents', [AccountDocumentController::class, 'store']);
Route::middleware('permission:quotations.create')->post('accounts/{account}/quotations', [AccountQuotationController::class, 'store']);
