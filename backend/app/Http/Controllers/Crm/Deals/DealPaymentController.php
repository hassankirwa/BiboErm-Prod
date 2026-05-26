<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealPaymentResource;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Services\Crm\CrmAttachmentStorageService;
use App\Services\Crm\Payments\DealPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DealPaymentController extends Controller
{
    public function __construct(
        protected DealPaymentService $dealPaymentService,
        protected CrmAttachmentStorageService $attachmentStorage,
    ) {}

    public function index(Request $request, Deal $deal): AnonymousResourceCollection
    {
        $this->authorize('view', $deal);
        $this->authorize('viewAny', DealPayment::class);

        $payments = $deal->payments()
            ->with('receivedBy')
            ->latest('payment_date')
            ->get();

        return DealPaymentResource::collection($payments);
    }

    public function store(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('create', [DealPayment::class, $deal]);

        $validated = $request->validate([
            'payment_reference' => ['required', 'string', 'max:100'],
            'payment_date' => ['required', 'date'],
            'amount_paid' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'max:30'],
            'payment_status' => ['nullable', 'string', 'max:30'],
            'quotation_id' => ['nullable', 'exists:quotations,id'],
            'proof_file_path' => ['nullable', 'string', 'max:500'],
            'proof_firebase_url' => ['nullable', 'string', 'max:500'],
            'proof_file' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($request->hasFile('proof_file')) {
            $stored = $this->attachmentStorage->store(
                $request->file('proof_file'),
                'deal-'.$deal->id,
            );
            $validated['proof_file_path'] = $stored['path'];
        }

        $payment = $this->dealPaymentService->record($deal, $request->user(), $validated);

        return response()->json([
            'data' => [
                'payment' => new DealPaymentResource($payment),
                'deal' => new DealResource($deal->fresh()->load(['contact', 'account', 'owner'])),
            ],
        ], 201);
    }
}
