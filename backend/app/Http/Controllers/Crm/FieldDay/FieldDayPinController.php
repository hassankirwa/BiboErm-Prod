<?php

namespace App\Http\Controllers\Crm\FieldDay;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\LeadDetailResource;
use App\Models\FieldDay;
use App\Models\FieldDayPin;
use App\Services\Crm\FieldDay\FieldDayPinLeadConversionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FieldDayPinController extends Controller
{
    public function __construct(
        protected FieldDayPinLeadConversionService $conversionService,
    ) {}

    public function show(FieldDayPin $fieldDayPin): JsonResponse
    {
        $this->authorize('view', $fieldDayPin);

        return response()->json([
            'data' => $fieldDayPin->load([
                'lead',
                'contact',
                'county',
                'fieldDay.fieldOfficer',
            ]),
        ]);
    }

    public function store(Request $request, FieldDay $fieldDay): JsonResponse
    {
        $this->authorize('update', $fieldDay);

        $validated = $request->validate([
            'lead_id' => ['nullable', 'exists:leads,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_m' => ['required', 'numeric', 'min:0', 'max:500'],
            'captured_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'findings' => ['nullable', 'string'],
            'site_label' => ['nullable', 'string', 'max:255'],
            'county_id' => ['nullable', 'exists:crm_counties,id'],
            'subcounty' => ['nullable', 'string', 'max:100'],
            'ward' => ['nullable', 'string', 'max:100'],
            'location_address' => ['nullable', 'string', 'max:2000'],
        ]);

        $pin = $fieldDay->pins()->create($validated);

        return response()->json([
            'data' => $pin->load(['lead', 'contact', 'county']),
        ], 201);
    }

    public function convertToLead(FieldDayPin $fieldDayPin): JsonResponse
    {
        $this->authorize('convertToLead', $fieldDayPin);

        $lead = $this->conversionService->convert($fieldDayPin, request()->user());

        return response()->json([
            'data' => new LeadDetailResource($lead),
        ], 201);
    }
}
