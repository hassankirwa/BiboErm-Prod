<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Http\Request;

class AcceptQuotationController extends Controller
{
    public function __construct(
        protected QuotationCalculatorService $quotationService,
    ) {}

    public function __invoke(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('accept', $quotation);

        $updated = $this->quotationService->accept($quotation, $request->user());

        return new QuotationResource($updated->load(['lines', 'deal']));
    }
}
