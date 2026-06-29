<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use App\Support\Crm\SiteVisitAssigneeRoles;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SiteVisitController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SiteVisit::class);

        $query = SiteVisit::query()
            ->visibleTo($request->user())
            ->with(['lead', 'deal', 'assignedFieldOfficer'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($date = $request->query('visit_date')) {
            $query->whereDate('visit_date', $date);
        }

        return SiteVisitResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): SiteVisitResource
    {
        $this->authorize('create', SiteVisit::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'lead_id' => ['nullable', 'exists:leads,id'],
            'deal_id' => ['nullable', 'exists:deals,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'site_address' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'assigned_field_officer_id' => [
                'required',
                'exists:users,id',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $assignee = User::query()->find($value);
                    if (! $assignee || ! SiteVisitAssigneeRoles::userIsEligible($assignee)) {
                        $fail('The selected assignee cannot perform site visits.');
                    }
                },
            ],
            'visit_date' => ['required', 'date'],
            'visit_time' => ['nullable', 'date_format:H:i'],
            'visit_purpose' => ['nullable', 'string', 'max:50'],
            'measurement_context' => ['nullable', 'string', 'in:quotation,production'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'requires_measurements' => ['nullable', 'boolean'],
            'notes_for_field_officer' => ['nullable', 'string'],
        ]);

        $visit = $this->workflowService->schedule($request->user(), $validated);

        return new SiteVisitResource($visit);
    }

    public function show(SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('view', $siteVisit);

        return new SiteVisitResource(
            $siteVisit->load([
                'lead',
                'deal.account',
                'deal.contact',
                'deal.assignedFieldOfficer',
                'project.account',
                'project.contact',
                'assignedFieldOfficer',
                'photos',
            ])
        );
    }
}
