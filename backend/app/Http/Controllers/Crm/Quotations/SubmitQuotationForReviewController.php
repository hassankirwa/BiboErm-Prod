<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Http\Request;

class SubmitQuotationForReviewController extends Controller
{
    public function __construct(
        protected QuotationCalculatorService $quotationService,
    ) {}

    public function __invoke(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('create', Quotation::class);

        $updated = $this->quotationService->submitForReview($quotation, $request->user());

        return new QuotationResource($updated->load(['lines', 'deal', 'account']));
    }
}
