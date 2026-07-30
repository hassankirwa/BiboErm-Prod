<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Enums\Crm\MeasurementContext;
use App\Enums\Crm\SiteVisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Models\User;
use App\Support\Crm\SiteVisitAssigneeRoles;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReassignSiteVisitController extends Controller
{
    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('reassign', $siteVisit);

        $measurementContext = $siteVisit->measurement_context instanceof MeasurementContext
            ? $siteVisit->measurement_context->value
            : (string) ($siteVisit->measurement_context ?? MeasurementContext::Production->value);

        $allowAnyActiveUser = $measurementContext === MeasurementContext::Production->value;

        $validated = $request->validate([
            'assigned_field_officer_id' => [
                'required',
                'integer',
                'exists:users,id',
                function (string $attribute, mixed $value, \Closure $fail) use ($allowAnyActiveUser): void {
                    $assignee = User::query()->find($value);
                    if (! $assignee || $assignee->status !== User::STATUS_ACTIVE) {
                        $fail('The selected assignee must be an active user.');

                        return;
                    }
                    if (! $allowAnyActiveUser && ! SiteVisitAssigneeRoles::userIsEligible($assignee)) {
                        $fail('The selected assignee cannot perform site visits.');
                    }
                },
            ],
        ]);

        $status = $siteVisit->status instanceof SiteVisitStatus
            ? $siteVisit->status->value
            : (string) $siteVisit->status;

        if (in_array($status, [
            SiteVisitStatus::SubmittedForReview->value,
            SiteVisitStatus::Approved->value,
            SiteVisitStatus::Cancelled->value,
        ], true)) {
            throw ValidationException::withMessages([
                'visit' => ["Cannot reassign a visit while status is {$status}."],
            ]);
        }

        $assigneeId = (int) $validated['assigned_field_officer_id'];
        $siteVisit->update([
            'assigned_field_officer_id' => $assigneeId,
            'assigned_to_user_id' => $assigneeId,
            'status' => in_array($status, [
                SiteVisitStatus::Scheduled->value,
                SiteVisitStatus::Assigned->value,
            ], true)
                ? SiteVisitStatus::Assigned->value
                : $status,
        ]);

        return new SiteVisitResource(
            $siteVisit->fresh()->load(['assignedFieldOfficer', 'reviewedBy', 'project']),
        );
    }
}
