<?php

namespace App\Http\Controllers\Quotation;

use App\Http\Controllers\Controller;
use App\Models\QuotationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotationRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = QuotationRequest::query()
            ->with(['lead', 'designJob', 'measurementReport', 'assignedQuotationUser'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($leadId = $request->query('lead_id')) {
            $query->where('lead_id', $leadId);
        }

        $requests = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => $requests->through(fn (QuotationRequest $item) => $this->serialize($item))->items(),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    public function show(QuotationRequest $quotationRequest): JsonResponse
    {
        return response()->json([
            'data' => $this->serialize(
                $quotationRequest->load([
                    'lead',
                    'designJob.files',
                    'measurementReport',
                    'assignedQuotationUser',
                    'quotations',
                ])
            ),
        ]);
    }

    /** @return array<string, mixed> */
    protected function serialize(QuotationRequest $request): array
    {
        return [
            'id' => $request->id,
            'request_number' => $request->request_number,
            'status' => $request->status,
            'lead_id' => $request->lead_id,
            'design_job_id' => $request->design_job_id,
            'measurement_report_id' => $request->measurement_report_id,
            'assigned_quotation_user_id' => $request->assigned_quotation_user_id,
            'created_at' => $request->created_at?->toIso8601String(),
            'quotations_count' => $request->relationLoaded('quotations') ? $request->quotations->count() : null,
        ];
    }
}
