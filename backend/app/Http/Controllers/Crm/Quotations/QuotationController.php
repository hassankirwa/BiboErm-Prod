<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Deal;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    public function __construct(
        protected QuotationCalculatorService $quotationService,
    ) {}

    public function store(Request $request, Deal $deal): QuotationResource
    {
        $this->authorize('create', Quotation::class);

        $validated = $request->validate([
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'revision_of_id' => ['nullable', 'exists:quotations,id'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.measurement_line_id' => ['nullable', 'exists:measurement_lines,id'],
            'lines.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $quotation = $this->quotationService->createForDeal($deal, $request->user(), $validated);

        return new QuotationResource($quotation);
    }

    public function show(Quotation $quotation): QuotationResource
    {
        $this->authorize('view', $quotation);

        return new QuotationResource(
            $quotation->load(['lines', 'deal', 'account', 'contact', 'preparedBy'])
        );
    }
}
