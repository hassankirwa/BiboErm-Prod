<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Services\Crm\Payments\DealPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DealPaymentController extends Controller
{
    public function __construct(
        protected DealPaymentService $dealPaymentService,
    ) {}

    public function store(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('update', $deal);

        $validated = $request->validate([
            'payment_reference' => ['required', 'string', 'max:100'],
            'payment_date' => ['required', 'date'],
            'amount_paid' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'max:30'],
            'payment_status' => ['nullable', 'string', 'max:30'],
            'quotation_id' => ['nullable', 'exists:quotations,id'],
            'proof_file_path' => ['nullable', 'string', 'max:500'],
            'proof_firebase_url' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = $this->dealPaymentService->record($deal, $request->user(), $validated);

        return response()->json([
            'data' => [
                'payment' => $payment,
                'deal' => new DealResource($deal->fresh()->load(['contact', 'account', 'owner'])),
            ],
        ], 201);
    }
}
