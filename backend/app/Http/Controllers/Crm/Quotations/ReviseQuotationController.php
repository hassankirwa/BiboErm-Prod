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
            'project_name' => ['nullable', 'string', 'max:255'],
            'project_number' => ['nullable', 'string', 'max:50'],
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'lines' => ['nullable', 'array', 'min:1'],
            'lines.*.description' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.series' => ['nullable', 'string', 'max:120'],
            'lines.*.code' => ['nullable', 'string', 'max:50'],
            'lines.*.glass_type' => ['nullable', 'string', 'max:255'],
            'lines.*.width_mm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.height_mm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.sqm_per_pcs' => ['nullable', 'numeric', 'min:0'],
            'lines.*.total_sqm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.line_total' => ['nullable', 'numeric', 'min:0'],
            'lines.*.metadata' => ['nullable', 'array'],
            'lines.*.measurement_line_id' => ['nullable', 'exists:measurement_lines,id'],
            'lines.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $revised = $this->quotationService->revise($quotation, $request->user(), $validated);

        return new QuotationResource($revised);
    }
}
