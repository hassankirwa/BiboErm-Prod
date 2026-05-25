<?php

namespace App\Http\Controllers\Crm\FieldDay;

use App\Http\Controllers\Controller;
use App\Models\FieldDay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FieldDayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', FieldDay::class);

        $query = FieldDay::query()
            ->with(['fieldOfficer', 'creator', 'pins'])
            ->latest('field_date');

        if ($officerId = $request->query('field_officer_id')) {
            $query->where('field_officer_id', $officerId);
        }

        if ($date = $request->query('field_date')) {
            $query->whereDate('field_date', $date);
        }

        return response()->json(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', FieldDay::class);

        $validated = $request->validate([
            'field_date' => ['required', 'date'],
            'field_officer_id' => ['required', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
            'pins' => ['nullable', 'array'],
            'pins.*.lead_id' => ['nullable', 'exists:leads,id'],
            'pins.*.contact_id' => ['nullable', 'exists:contacts,id'],
            'pins.*.latitude' => ['nullable', 'numeric'],
            'pins.*.longitude' => ['nullable', 'numeric'],
            'pins.*.notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        $fieldDay = FieldDay::query()->create([
            'field_date' => $validated['field_date'],
            'field_officer_id' => $validated['field_officer_id'],
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        foreach ($validated['pins'] ?? [] as $pin) {
            $fieldDay->pins()->create($pin);
        }

        return response()->json([
            'data' => $fieldDay->load(['fieldOfficer', 'creator', 'pins']),
        ], 201);
    }
}
