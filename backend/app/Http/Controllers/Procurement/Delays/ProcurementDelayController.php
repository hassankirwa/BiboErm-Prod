<?php

namespace App\Http\Controllers\Procurement\Delays;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\ProcurementDelayResource;
use App\Models\Procurement\ProcurementDelay;
use App\Services\Procurement\ProcurementAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProcurementDelayController extends Controller
{
    public function __construct(protected ProcurementAuditLogger $audit) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ProcurementDelay::class);

        $query = ProcurementDelay::query()->with(['project', 'purchaseOrder'])->latest();
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        return ProcurementDelayResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ProcurementDelay::class);

        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'purchase_order_id' => ['nullable', 'integer', 'exists:purchase_orders,id'],
            'glass_order_id' => ['nullable', 'integer', 'exists:glass_orders,id'],
            'reason' => ['required', 'string', 'max:255'],
            'expected_date' => ['nullable', 'date'],
            'actual_date' => ['nullable', 'date'],
            'impact_notes' => ['nullable', 'string'],
        ]);

        $daysDelayed = null;
        if (! empty($validated['expected_date']) && ! empty($validated['actual_date'])) {
            $daysDelayed = (int) (strtotime($validated['actual_date']) - strtotime($validated['expected_date'])) / 86400;
        }

        $delay = ProcurementDelay::query()->create([
            ...$validated,
            'days_delayed' => $daysDelayed,
            'logged_by' => $request->user()->id,
        ]);

        $this->audit->log('delay.logged', $delay);

        return (new ProcurementDelayResource($delay))->response()->setStatusCode(201);
    }
}
