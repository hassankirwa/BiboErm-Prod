<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Enums\FieldInstallation\NonConformitySeverity;
use App\Enums\FieldInstallation\NonConformityType;
use App\Http\Controllers\Controller;
use App\Http\Resources\FieldInstallation\FieldNonConformityResource;
use App\Http\Resources\Projects\DesignChangeOrderResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Services\FieldInstallation\FieldNonConformityService;
use App\Services\Projects\DesignChangeOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FieldDesignChangeController extends Controller
{
    public function __construct(
        protected FieldNonConformityService $nonConformities,
        protected DesignChangeOrderService $designChanges,
    ) {}

    public function store(Request $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('log', $fieldJob);

        $validated = $request->validate([
            'nc_type' => [
                'required',
                Rule::in([
                    NonConformityType::WrongMeasurement->value,
                    NonConformityType::DimensionMismatch->value,
                ]),
            ],
            'severity' => ['required', Rule::enum(NonConformitySeverity::class)],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'delivery_record_id' => ['nullable', 'integer', 'exists:field_delivery_records,id'],
            'daily_log_id' => ['nullable', 'integer', 'exists:field_installation_daily_logs,id'],
            'project_bom_line_id' => ['nullable', 'integer', 'exists:project_bom_lines,id'],
            'warehouse_item_id' => ['nullable', 'integer'],
            'qty_affected' => ['nullable', 'numeric', 'min:0'],
            'reason' => ['nullable', 'string'],
            'measurement_notes' => ['nullable'],
            'scope_bom_line_ids' => ['nullable', 'array'],
            'scope_bom_line_ids.*' => ['integer'],
        ]);

        $ncPayload = collect($validated)->only([
            'nc_type',
            'severity',
            'title',
            'description',
            'delivery_record_id',
            'daily_log_id',
            'project_bom_line_id',
            'warehouse_item_id',
            'qty_affected',
        ])->all();

        $nc = $this->nonConformities->report($fieldJob, $request->user(), $ncPayload);

        $dco = $this->designChanges->createFromNonConformity($nc, $request->user(), [
            'reason' => $validated['reason'] ?? $nc->description,
            'measurement_notes' => $validated['measurement_notes'] ?? null,
            'scope_bom_line_ids' => $validated['scope_bom_line_ids'] ?? null,
        ]);

        return response()->json([
            'data' => [
                'non_conformity' => (new FieldNonConformityResource($nc))->resolve(),
                'design_change_order' => (new DesignChangeOrderResource(
                    $dco->loadMissing(['nonConformity', 'parentProductionOrder', 'requester'])
                ))->resolve(),
            ],
        ], 201);
    }
}
