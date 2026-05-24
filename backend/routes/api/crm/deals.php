<?php

use App\Http\Controllers\Crm\Deals\CreateProjectFromDealController;
use App\Http\Controllers\Crm\Deals\DealController;
use App\Http\Controllers\Crm\Deals\DealPaymentController;
use App\Http\Controllers\Crm\Deals\MarkDealLostController;
use App\Http\Controllers\Crm\Deals\MarkDealWonController;
use App\Http\Controllers\Crm\Deals\UpdateDealStageController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:deals.view')->get('deals', [DealController::class, 'index']);
Route::middleware('permission:deals.create')->post('deals', [DealController::class, 'store']);
Route::middleware('permission:deals.view')->get('deals/{deal}', [DealController::class, 'show']);
Route::middleware('permission:deals.update')->put('deals/{deal}', [DealController::class, 'update']);
Route::middleware('permission:deals.update')->patch('deals/{deal}/stage', UpdateDealStageController::class);
Route::middleware('permission:deals.mark_won')->post('deals/{deal}/mark-won', MarkDealWonController::class);
Route::middleware('permission:deals.mark_lost')->post('deals/{deal}/mark-lost', MarkDealLostController::class);
Route::middleware('permission:deals.create_project')->post('deals/{deal}/create-project', CreateProjectFromDealController::class);
Route::middleware('permission:deal_payments.record')->post('deals/{deal}/payments', [DealPaymentController::class, 'store']);
