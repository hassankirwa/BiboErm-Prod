<?php

namespace App\Http\Controllers\Crm\Activities;

use App\Http\Controllers\Controller;
use App\Models\CrmActivity;
use App\Support\Crm\CrmActivityTypeGroups;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CrmActivity::class);

        $query = CrmActivity::query()
            ->with(['assignee', 'lead', 'contact', 'deal'])
            ->latest();

        if ($leadId = $request->query('lead_id')) {
            $query->where('lead_id', $leadId);
        }

        if ($dealId = $request->query('deal_id')) {
            $query->where('deal_id', $dealId);
        }

        if ($status = $request->query('status')) {
            if ($status === 'open') {
                $query->where('status', '!=', 'completed');
            } else {
                $query->where('status', $status);
            }
        }

        if ($activityType = $request->query('activity_type')) {
            $types = CrmActivityTypeGroups::resolveFilterTypes($activityType);
            $query->where(function ($q) use ($types) {
                $q->whereIn('activity_type', $types)
                    ->orWhereIn('type', $types);
            });
        }

        if ($contactId = $request->query('contact_id')) {
            $query->where('contact_id', $contactId);
        }

        if ($assignedTo = $request->query('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }

        return response()->json(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', CrmActivity::class);

        $activityTypes = CrmActivityTypeGroups::allTypes();

        $validated = $request->validate([
            'activity_type' => [
                'required_without:type',
                'nullable',
                'string',
                'max:30',
                Rule::in($activityTypes),
            ],
            'type' => [
                'required_without:activity_type',
                'nullable',
                'string',
                'max:64',
                Rule::in($activityTypes),
            ],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
            'scheduled_start_at' => ['nullable', 'date'],
            'scheduled_end_at' => ['nullable', 'date', 'after_or_equal:scheduled_start_at'],
            'priority' => ['nullable', 'string', 'max:20'],
            'location' => ['nullable', 'string', 'max:500'],
            'outcome' => ['nullable', 'string', 'max:50'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'recipient' => ['nullable', 'string', 'max:255'],
            'reminder_minutes_before' => ['nullable', 'integer', 'min:0'],
            'lead_id' => ['nullable', 'exists:leads,id', 'required_without_all:contact_id,deal_id,account_id'],
            'contact_id' => ['nullable', 'exists:contacts,id', 'required_without_all:lead_id,deal_id,account_id'],
            'deal_id' => ['nullable', 'exists:deals,id', 'required_without_all:lead_id,contact_id,account_id'],
            'account_id' => ['nullable', 'exists:accounts,id', 'required_without_all:lead_id,contact_id,deal_id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);

        $user = $request->user();
        $relatedType = null;
        $relatedId = null;

        if (! empty($validated['account_id'])) {
            $relatedType = \App\Models\Account::class;
            $relatedId = $validated['account_id'];
        } elseif (! empty($validated['lead_id'])) {
            $relatedType = \App\Models\Lead::class;
            $relatedId = $validated['lead_id'];
        } elseif (! empty($validated['deal_id'])) {
            $relatedType = \App\Models\Deal::class;
            $relatedId = $validated['deal_id'];
        } elseif (! empty($validated['contact_id'])) {
            $relatedType = \App\Models\Contact::class;
            $relatedId = $validated['contact_id'];
        }

        $activity = CrmActivity::query()->create([
            ...$validated,
            'type' => $validated['type'] ?? $validated['activity_type'] ?? 'task',
            'activity_type' => $validated['activity_type'] ?? $validated['type'] ?? 'task',
            'body' => $validated['body'] ?? $validated['description'] ?? null,
            'description' => $validated['description'] ?? $validated['body'] ?? null,
            'status' => 'pending',
            'activitable_type' => $relatedType,
            'activitable_id' => $relatedId,
            'assigned_to' => $validated['assigned_to'] ?? $user->id,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'data' => $activity->load(['assignee', 'lead', 'contact', 'deal']),
        ], 201);
    }

    public function complete(Request $request, CrmActivity $activity): JsonResponse
    {
        $this->authorize('complete', $activity);

        $activity->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'data' => $activity->fresh()->load(['assignee', 'lead', 'contact', 'deal']),
        ]);
    }
}
