<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Enums\Crm\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\Leads\StoreLeadRequest;
use App\Http\Requests\Crm\Leads\UpdateLeadRequest;
use App\Http\Resources\Crm\LeadDetailResource;
use App\Http\Resources\Crm\LeadResource;
use App\Models\CrmActivity;
use App\Models\FieldDayPin;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Services\Crm\Leads\AccountProvisioningService;
use App\Services\Crm\Leads\LeadSalesContextService;
use App\Services\Crm\Leads\LeadContactService;
use App\Services\Crm\Leads\LeadNumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeadController extends Controller
{
    public function __construct(
        protected LeadNumberGenerator $leadNumberGenerator,
        protected LeadContactService $leadContactService,
        protected AccountProvisioningService $accountProvisioning,
        protected LeadSalesContextService $leadSalesContext,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Lead::class);

        $query = Lead::query()
            ->visibleTo($request->user())
            ->with(['leadOwner', 'assignedSalesUser', 'assignedFieldOfficer', 'assignee', 'leadSource'])
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

        if ($request->boolean('unassigned')) {
            $query->whereNull('lead_owner_id')
                ->whereNull('assigned_sales_user_id')
                ->whereNull('assigned_to');
        }

        if ($request->boolean('hot')) {
            $query->whereIn('priority', ['high', 'urgent']);
        }

        return LeadResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(StoreLeadRequest $request): JsonResponse
    {
        $this->authorize('create', Lead::class);

        $validated = $request->validated();
        $fieldDayPinId = $validated['field_day_pin_id'] ?? null;
        unset($validated['field_day_pin_id']);

        $user = $request->user();
        $leadNumber = $this->leadNumberGenerator->generate();

        $lead = Lead::query()->create([
            ...$validated,
            ...$this->legacyNameFields($validated),
            'source' => $this->resolveSource($validated),
            'product_interests' => $validated['product_interests'] ?? ['custom'],
            'need_site_visit' => $validated['need_site_visit'] ?? false,
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

        $this->leadContactService->createFromLead($lead, $user);

        if ($fieldDayPinId) {
            FieldDayPin::query()
                ->whereKey($fieldDayPinId)
                ->whereNull('lead_id')
                ->update(['lead_id' => $lead->id]);
        }

        return (new LeadDetailResource(
            $lead->fresh()->load([
                'leadOwner',
                'assignedSalesUser',
                'assignedFieldOfficer',
                'leadSource',
                'sourceContact',
            ])
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Lead $lead): LeadDetailResource
    {
        $this->authorize('view', $lead);

        if (! $lead->converted_account_id) {
            $reconciled = $this->accountProvisioning->reconcileLeadAccount($lead, $request->user());

            if (! $reconciled) {
                $status = $lead->status instanceof LeadStatus
                    ? $lead->status->value
                    : (string) $lead->status;

                if ($status === LeadStatus::Interested->value) {
                    try {
                        $this->accountProvisioning->provisionFromLead($lead, $request->user());
                    } catch (\Throwable) {
                        // Leave lead unchanged; UI keeps polling until provisioning succeeds.
                    }
                }
            }

            $lead->refresh();
        }

        $this->leadSalesContext->reconcileLeadDealLink($lead);
        $lead->refresh();

        $salesContext = $this->leadSalesContext->resolve($lead);
        $lead->sales_context = $salesContext;

        return new LeadDetailResource(
            $lead->load([
                'leadOwner',
                'assignedSalesUser',
                'assignedFieldOfficer',
                'leadSource',
                'buildingConstructionStage',
                'photos',
                'sourceContact',
                'convertedContact',
                'convertedAccount',
                'convertedDeal',
                'siteVisits',
                'activities',
                'attachments',
            ])
        );
    }

    public function update(UpdateLeadRequest $request, Lead $lead): LeadDetailResource
    {
        $this->authorize('update', $lead);

        $validated = $request->validated();

        $updateData = [
            ...$validated,
            'updated_by' => $request->user()->id,
        ];

        if ($this->hasLegacyNameInput($validated)) {
            $updateData = [
                ...$updateData,
                ...$this->legacyNameFields([
                    ...$lead->only(['name', 'contact_person_name', 'first_name', 'last_name', 'account_name', 'company']),
                    ...$validated,
                ]),
            ];
        }

        if (array_key_exists('source', $validated) || array_key_exists('lead_source_id', $validated)) {
            $updateData['source'] = $this->resolveSource([
                ...$lead->only(['lead_source_id', 'source']),
                ...$validated,
            ], $lead);
        }

        $lead->update($updateData);

        return new LeadDetailResource(
            $lead->fresh()->load([
                'leadOwner',
                'assignedSalesUser',
                'assignedFieldOfficer',
                'leadSource',
                'sourceContact',
            ])
        );
    }

    public function destroy(Lead $lead): \Illuminate\Http\JsonResponse
    {
        $this->authorize('delete', $lead);

        $lead->delete();

        return response()->json(null, 204);
    }

    /** @return array{first_name: string, last_name: ?string, company: ?string} */
    protected function legacyNameFields(array $validated): array
    {
        $company = $validated['company'] ?? ($validated['account_name'] ?? null);

        if (! empty($validated['first_name'])) {
            return [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'] ?? null,
                'company' => $company,
            ];
        }

        $contactName = trim($validated['contact_person_name'] ?? '');
        if ($contactName !== '') {
            $parts = preg_split('/\s+/', $contactName, 2) ?: [];

            return [
                'first_name' => $parts[0] ?? 'Contact',
                'last_name' => $parts[1] ?? null,
                'company' => $company,
            ];
        }

        return [
            'first_name' => trim($validated['name'] ?? '') ?: 'Lead',
            'last_name' => null,
            'company' => $company,
        ];
    }

    protected function resolveSource(array $validated, ?Lead $existing = null): ?string
    {
        if (array_key_exists('source', $validated) && $validated['source'] !== null) {
            return $validated['source'];
        }

        $leadSourceId = $validated['lead_source_id'] ?? $existing?->lead_source_id;

        if (! $leadSourceId) {
            return $existing?->source;
        }

        return LeadSource::query()->whereKey($leadSourceId)->value('slug') ?? $existing?->source;
    }

    protected function hasLegacyNameInput(array $validated): bool
    {
        foreach (['name', 'contact_person_name', 'first_name', 'last_name', 'account_name', 'company'] as $key) {
            if (array_key_exists($key, $validated)) {
                return true;
            }
        }

        return false;
    }
}
