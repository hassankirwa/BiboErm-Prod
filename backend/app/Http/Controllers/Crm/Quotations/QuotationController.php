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

    public function show(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('view', $quotation);

        $quotation->load([
            'lines',
            'deal',
            'deal.project',
            'deal.quotations' => fn ($q) => $q->excludingReferenceCopies()->with('lines')->latest('id'),
            'account',
            'contact',
            'preparedBy',
        ]);

        if ($request->query('include') === 'history') {
            $quotation->setRelation(
                'revisionHistory',
                $this->quotationService->revisionHistory($quotation),
            );
        }

        return new QuotationResource($quotation);
    }

    public function update(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('create', Quotation::class);

        $validated = $request->validate([
            'valid_until' => ['sometimes', 'nullable', 'date'],
            'terms_conditions' => ['sometimes', 'nullable', 'string'],
            'discount_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'tax_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.description' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.measurement_line_id' => ['nullable', 'exists:measurement_lines,id'],
            'lines.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $updated = $this->quotationService->updateDraft($quotation, $validated);

        return new QuotationResource($updated);
    }
}
