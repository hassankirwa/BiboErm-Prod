<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Http\Request;

class ReviseQuotationController extends Controller
{
    public function __construct(
        protected QuotationCalculatorService $quotationService,
    ) {}

    public function __invoke(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('create', Quotation::class);

        $validated = $request->validate([
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'lines' => ['nullable', 'array', 'min:1'],
            'lines.*.description' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.measurement_line_id' => ['nullable', 'exists:measurement_lines,id'],
            'lines.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $revised = $this->quotationService->revise($quotation, $request->user(), $validated);

        return new QuotationResource($revised);
    }
}
