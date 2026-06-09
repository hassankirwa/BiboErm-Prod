<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Http\Request;

class AppendQuotationNegotiationNoteController extends Controller
{
    public function __construct(
        protected QuotationCalculatorService $quotationService,
    ) {}

    public function __invoke(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('create', Quotation::class);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $updated = $this->quotationService->appendNegotiationNote(
            $quotation,
            $request->user(),
            $validated['body'],
        );

        return new QuotationResource($updated->load(['lines', 'deal', 'account']));
    }
}
