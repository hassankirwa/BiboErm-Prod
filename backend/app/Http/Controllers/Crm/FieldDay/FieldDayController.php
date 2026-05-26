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

        $user = $request->user();
        $query = FieldDay::query()
            ->with(['fieldOfficer', 'creator', 'pins.lead', 'pins.county'])
            ->latest('field_date');

        if ($officerId = $request->query('field_officer_id')) {
            $query->where('field_officer_id', $officerId);
        } elseif (! $user->can('field_day.manage')) {
            $query->where(function ($q) use ($user) {
                $q->where('field_officer_id', $user->id)
                    ->orWhere('created_by', $user->id);
            });
        }

        if ($date = $request->query('field_date')) {
            $query->whereDate('field_date', $date);
        }

        $paginator = $query->paginate($request->integer('per_page', 25));

        return response()->json($paginator);
    }

    public function show(FieldDay $fieldDay): JsonResponse
    {
        $this->authorize('view', $fieldDay);

        return response()->json([
            'data' => $fieldDay->load([
                'fieldOfficer',
                'creator',
                'pins.lead',
                'pins.contact',
                'pins.county',
            ]),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $this->authorize('create', FieldDay::class);

        $validated = $request->validate([
            'field_date' => ['nullable', 'date'],
            'field_officer_id' => ['nullable', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $date = $validated['field_date'] ?? now()->toDateString();
        $officerId = (int) ($validated['field_officer_id'] ?? $user->id);

        if (! $user->can('field_day.manage') && $officerId !== $user->id) {
            abort(403, 'You can only start a field day for yourself.');
        }

        [$fieldDay, $created] = FieldDay::findOrCreateForOfficer(
            $date,
            $officerId,
            $user->id,
            $validated['notes'] ?? null,
        );

        return response()->json([
            'data' => $fieldDay->load([
                'fieldOfficer',
                'creator',
                'pins.lead',
                'pins.contact',
                'pins.county',
            ]),
        ], $created ? 201 : 200);
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
            'pins.*.latitude' => ['required_with:pins', 'numeric', 'between:-90,90'],
            'pins.*.longitude' => ['required_with:pins', 'numeric', 'between:-180,180'],
            'pins.*.accuracy_m' => ['required_with:pins', 'numeric', 'min:0', 'max:500'],
            'pins.*.captured_at' => ['required_with:pins', 'date'],
            'pins.*.notes' => ['nullable', 'string'],
            'pins.*.findings' => ['nullable', 'string'],
            'pins.*.site_label' => ['nullable', 'string', 'max:255'],
            'pins.*.county_id' => ['nullable', 'exists:crm_counties,id'],
            'pins.*.subcounty' => ['nullable', 'string', 'max:100'],
            'pins.*.ward' => ['nullable', 'string', 'max:100'],
            'pins.*.location_address' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $officerId = (int) $validated['field_officer_id'];

        if (! $user->can('field_day.manage') && $officerId !== $user->id) {
            abort(403, 'You can only create a field day for yourself.');
        }

        [$fieldDay, $created] = FieldDay::findOrCreateForOfficer(
            $validated['field_date'],
            $officerId,
            $user->id,
            $validated['notes'] ?? null,
        );

        foreach ($validated['pins'] ?? [] as $pin) {
            $fieldDay->pins()->create($pin);
        }

        return response()->json([
            'data' => $fieldDay->load([
                'fieldOfficer',
                'creator',
                'pins.lead',
                'pins.contact',
                'pins.county',
            ]),
        ], $created ? 201 : 200);
    }
}
