<?php

namespace App\Http\Controllers\Projects;

use App\Enums\Crm\MeasurementContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\Project;
use App\Models\User;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use App\Support\Crm\SiteVisitAssigneeRoles;
use App\Support\ProjectSiteLocation;
use Illuminate\Http\Request;

class ScheduleProjectMeasurementVisitController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function __invoke(Request $request, Project $project): SiteVisitResource
    {
        $this->authorize('scheduleMeasurementVisit', $project);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
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
            'site_address' => ['nullable', 'string', 'max:500'],
            'notes_for_field_officer' => ['nullable', 'string'],
        ]);

        $location = ProjectSiteLocation::resolve($project);

        $visit = $this->workflowService->schedule($request->user(), [
            'title' => $validated['title'] ?? "Production measurement — {$project->name}",
            'project_id' => $project->id,
            'account_id' => $project->account_id,
            'deal_id' => $project->deal_id,
            'contact_id' => $project->contact_id,
            'site_address' => trim((string) ($validated['site_address'] ?? '')) !== ''
                ? $validated['site_address']
                : $location['site_address'],
            'assigned_field_officer_id' => $validated['assigned_field_officer_id'],
            'visit_date' => $validated['visit_date'],
            'visit_time' => $validated['visit_time'] ?? null,
            'measurement_context' => MeasurementContext::Production->value,
            'requires_measurements' => true,
            'notes_for_field_officer' => $validated['notes_for_field_officer'] ?? null,
        ]);

        return new SiteVisitResource($visit->load(['project', 'assignedFieldOfficer']));
    }
}
