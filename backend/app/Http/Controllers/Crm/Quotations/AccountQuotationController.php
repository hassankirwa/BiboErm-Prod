<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Account;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Http\Request;

class AccountQuotationController extends Controller
{
    public function __construct(
        protected QuotationCalculatorService $calculator,
    ) {}

    public function store(Request $request, Account $account): QuotationResource
    {
        $this->authorize('update', $account);

        $validated = $request->validate([
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.measurement_line_id' => ['nullable', 'integer'],
            'lines.*.sort_order' => ['nullable', 'integer'],
        ]);

        $quotation = $this->calculator->createForAccount($account, $request->user(), $validated);

        return new QuotationResource($quotation);
    }
}
