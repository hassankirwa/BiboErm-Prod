<?php

use App\Http\Controllers\Crm\Accounts\AccountController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:accounts.view')->get('accounts', [AccountController::class, 'index']);
Route::middleware('permission:accounts.create')->post('accounts', [AccountController::class, 'store']);
Route::middleware('permission:accounts.view')->get('accounts/{account}', [AccountController::class, 'show']);
Route::middleware('permission:accounts.update')->put('accounts/{account}', [AccountController::class, 'update']);
Route::middleware('permission:deals.view')->get('accounts/{account}/deals', [AccountController::class, 'deals']);
