<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\Leads\StoreLeadRequest;
use App\Http\Requests\Crm\Leads\UpdateLeadRequest;
use App\Http\Resources\Crm\LeadDetailResource;
use App\Http\Resources\Crm\LeadResource;
use App\Models\CrmActivity;
use App\Models\Lead;
use App\Services\Crm\Leads\LeadNumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeadController extends Controller
{
    public function __construct(
        protected LeadNumberGenerator $leadNumberGenerator,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Lead::class);

        $query = Lead::query()
            ->visibleTo($request->user())
            ->with(['leadOwner', 'assignedSalesUser', 'assignedFieldOfficer', 'assignee'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('contact_person_name', 'ilike', "%{$search}%")
                    ->orWhere('account_name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%")
                    ->orWhere('lead_number', 'ilike', "%{$search}%")
                    ->orWhere('reference', 'ilike', "%{$search}%");
            });
        }

        if ($ownerId = $request->query('owner_id')) {
            $query->where(function ($q) use ($ownerId) {
                $q->where('lead_owner_id', $ownerId)
                    ->orWhere('assigned_sales_user_id', $ownerId);
            });
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        return LeadResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(StoreLeadRequest $request): LeadDetailResource
    {
        $this->authorize('create', Lead::class);

        $validated = $request->validated();

        $user = $request->user();
        $leadNumber = $this->leadNumberGenerator->generate();

        $lead = Lead::query()->create([
            ...$validated,
            ...$this->legacyNameFields($validated),
            'reference' => $leadNumber,
            'lead_number' => $leadNumber,
            'status' => $validated['status'] ?? 'new',
            'lead_owner_id' => $validated['lead_owner_id'] ?? $user->id,
            'assigned_to' => $validated['assigned_sales_user_id'] ?? $validated['lead_owner_id'] ?? $user->id,
            'created_by' => $user->id,
        ]);

        if (! empty($validated['next_action']) && ! empty($validated['next_follow_up_at'])) {
            CrmActivity::query()->create([
                'type' => 'task',
                'activity_type' => 'task',
                'subject' => $validated['next_action'],
                'status' => 'pending',
                'priority' => $validated['priority'] ?? 'medium',
                'due_at' => $validated['next_follow_up_at'],
                'lead_id' => $lead->id,
                'activitable_type' => Lead::class,
                'activitable_id' => $lead->id,
                'assigned_to' => $validated['assigned_sales_user_id'] ?? $user->id,
                'created_by' => $user->id,
            ]);
        }

        return new LeadDetailResource(
            $lead->load(['leadOwner', 'assignedSalesUser', 'assignedFieldOfficer'])
        );
    }

    public function show(Lead $lead): LeadDetailResource
    {
        $this->authorize('view', $lead);

        return new LeadDetailResource(
            $lead->load([
                'leadOwner',
                'assignedSalesUser',
                'assignedFieldOfficer',
                'convertedContact',
                'convertedAccount',
                'convertedDeal',
                'siteVisits',
                'activities',
            ])
        );
    }

    public function update(UpdateLeadRequest $request, Lead $lead): LeadDetailResource
    {
        $this->authorize('update', $lead);

        $validated = $request->validated();

        $lead->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        return new LeadDetailResource(
            $lead->fresh()->load(['leadOwner', 'assignedSalesUser', 'assignedFieldOfficer'])
        );
    }

    /** @return array{first_name: string, last_name: ?string, company: ?string} */
    protected function legacyNameFields(array $validated): array
    {
        $fullName = $validated['contact_person_name'] ?? $validated['name'] ?? '';
        $parts = preg_split('/\s+/', trim($fullName), 2) ?: [];

        return [
            'first_name' => $validated['first_name'] ?? ($parts[0] ?? 'Lead'),
            'last_name' => $validated['last_name'] ?? ($parts[1] ?? null),
            'company' => $validated['company'] ?? ($validated['account_name'] ?? null),
        ];
    }
}
