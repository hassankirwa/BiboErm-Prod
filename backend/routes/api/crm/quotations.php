<?php

use App\Http\Controllers\Crm\Quotations\AcceptQuotationController;
use App\Http\Controllers\Crm\Quotations\AppendQuotationNegotiationNoteController;
use App\Http\Controllers\Crm\Quotations\DownloadQuotationPdfController;
use App\Http\Controllers\Crm\Quotations\QuotationController;
use App\Http\Controllers\Crm\Quotations\ReviseQuotationController;
use App\Http\Controllers\Crm\Quotations\ApproveQuotationController;
use App\Http\Controllers\Crm\Quotations\SendQuotationController;
use App\Http\Controllers\Crm\Quotations\SubmitQuotationForReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:quotations.create')->post('deals/{deal}/quotations', [QuotationController::class, 'store']);
Route::middleware('permission:quotations.view')->get('quotations/{quotation}', [QuotationController::class, 'show']);
Route::middleware('permission:quotations.create')->patch('quotations/{quotation}', [QuotationController::class, 'update']);
Route::middleware('permission:quotations.view')->get('quotations/{quotation}/pdf', DownloadQuotationPdfController::class);
Route::middleware('permission:quotations.create')->post('quotations/{quotation}/submit-for-review', SubmitQuotationForReviewController::class);
Route::middleware('permission:quotations.approve|quotations.send|crm.manage')->post('quotations/{quotation}/approve', ApproveQuotationController::class);
Route::middleware('permission:quotations.send|quotations.approve')->post('quotations/{quotation}/send', SendQuotationController::class);
Route::middleware('permission:quotations.create')->post('quotations/{quotation}/negotiation-notes', AppendQuotationNegotiationNoteController::class);
Route::middleware('permission:quotations.create')->post('quotations/{quotation}/revise', ReviseQuotationController::class);
Route::middleware('permission:deals.update')->post('quotations/{quotation}/accept', AcceptQuotationController::class);
