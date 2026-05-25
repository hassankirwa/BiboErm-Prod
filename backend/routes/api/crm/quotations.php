<?php

use App\Http\Controllers\Crm\Quotations\AcceptQuotationController;
use App\Http\Controllers\Crm\Quotations\DownloadQuotationPdfController;
use App\Http\Controllers\Crm\Quotations\QuotationController;
use App\Http\Controllers\Crm\Quotations\ReviseQuotationController;
use App\Http\Controllers\Crm\Quotations\SendQuotationController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:quotations.create')->post('deals/{deal}/quotations', [QuotationController::class, 'store']);
Route::middleware('permission:quotations.view')->get('quotations/{quotation}', [QuotationController::class, 'show']);
Route::middleware('permission:quotations.view')->get('quotations/{quotation}/pdf', DownloadQuotationPdfController::class);
Route::middleware('permission:quotations.send')->post('quotations/{quotation}/send', SendQuotationController::class);
Route::middleware('permission:quotations.create')->post('quotations/{quotation}/revise', ReviseQuotationController::class);
Route::middleware('permission:deals.update')->post('quotations/{quotation}/accept', AcceptQuotationController::class);
