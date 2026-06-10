<?php

use App\Http\Controllers\Quotation\QuotationRequestController;
use Illuminate\Support\Facades\Route;

$viewQuotation = 'quotations.view|quotations.create|crm.view|crm.manage';

Route::middleware("permission:{$viewQuotation}")->group(function () {
    Route::get('requests', [QuotationRequestController::class, 'index']);
    Route::get('requests/{quotationRequest}', [QuotationRequestController::class, 'show']);
});
