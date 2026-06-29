<?php

namespace App\Services\Crm\SiteVisits;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\MeasurementContext;
use App\Enums\Crm\MeasurementFormStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Crm\Leads\LeadStageService;
use App\Support\ProjectSiteLocation;
use App\Support\SiteMeasurementFormData;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SiteVisitWorkflowService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected LeadStageService $leadStageService,
    ) {}

    public function schedule(User $user, array $data): SiteVisit
    {
        return DB::transaction(function () use ($user, $data) {
            $context = MeasurementContext::tryFrom((string) ($data['measurement_context'] ?? 'quotation'))
                ?? MeasurementContext::Quotation;

            $this->assertValidScheduleContext($data, $context);

            if (empty($data['assigned_field_officer_id']) && ! empty($data['deal_id'])) {
                $deal = Deal::query()->find($data['deal_id']);
                if ($deal?->assigned_field_officer_id) {
                    $data['assigned_field_officer_id'] = $deal->assigned_field_officer_id;
                }
            }

            if ($context === MeasurementContext::Production && ! empty($data['project_id'])) {
                $project = Project::query()->find($data['project_id']);
                $data['account_id'] = $data['account_id'] ?? $project?->account_id;
                $data['deal_id'] = $data['deal_id'] ?? $project?->deal_id;
                $resolved = $project ? ProjectSiteLocation::resolve($project) : ['site_address' => null, 'latitude' => null, 'longitude' => null];
                $data['site_address'] = trim((string) ($data['site_address'] ?? '')) !== ''
                    ? $data['site_address']
                    : $resolved['site_address'];
                $data['latitude'] = $data['latitude'] ?? $resolved['latitude'];
                $data['longitude'] = $data['longitude'] ?? $resolved['longitude'];
            }

            $visit = SiteVisit::query()->create([
                'visit_number' => 'SV-'.strtoupper(Str::random(8)),
                'title' => $data['title'],
                'lead_id' => $data['lead_id'] ?? null,
                'deal_id' => $data['deal_id'] ?? null,
                'account_id' => $data['account_id'] ?? null,
                'project_id' => $data['project_id'] ?? null,
                'contact_id' => $data['contact_id'] ?? null,
                'site_address' => $data['site_address'] ?? null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'assigned_field_officer_id' => $data['assigned_field_officer_id'],
                'scheduled_by' => $user->id,
                'visit_date' => $data['visit_date'],
                'visit_time' => $data['visit_time'] ?? null,
                'visit_purpose' => $data['visit_purpose'] ?? ($context === MeasurementContext::Production ? 'measurement' : null),
                'measurement_context' => $context->value,
                'requires_measurements' => $data['requires_measurements'] ?? true,
                'status' => SiteVisitStatus::Scheduled->value,
                'measurement_form_status' => MeasurementFormStatus::Draft->value,
                'notes_for_field_officer' => $data['notes_for_field_officer'] ?? null,
                'measurement_form_data' => $this->buildDefaultFormData($data, $user),
            ]);

            if ($visit->lead_id && $context === MeasurementContext::Quotation) {
                $lead = Lead::query()->find($visit->lead_id);
                $leadStatus = $lead?->status instanceof LeadStatus
                    ? $lead->status->value
                    : (string) ($lead?->status ?? '');

                if (! in_array($leadStatus, [
                    LeadStatus::AccountCreated->value,
                    LeadStatus::Interested->value,
                ], true)) {
                    Lead::query()->whereKey($visit->lead_id)->update([
                        'status' => LeadStatus::SiteVisitScheduled->value,
                    ]);
                }
            }

            return $visit->load(['lead', 'deal', 'project', 'assignedFieldOfficer']);
        });
    }

    public function start(SiteVisit $visit, User $user, array $data): SiteVisit
    {
        $this->assertAssignedFieldOfficer($visit, $user);

        $current = $this->visitStatusValue($visit);

        if (! in_array($current, [
            SiteVisitStatus::Scheduled->value,
            SiteVisitStatus::Assigned->value,
            SiteVisitStatus::InProgress->value,
        ], true)) {
            throw ValidationException::withMessages([
                'visit' => ["Cannot start a visit while status is {$current}."],
            ]);
        }

        if ($current === SiteVisitStatus::InProgress->value) {
            return $visit->fresh()->load(['assignedFieldOfficer', 'photos', 'project']);
        }

        $visit->update([
            'status' => SiteVisitStatus::InProgress->value,
            'actual_latitude' => $data['latitude'] ?? null,
            'actual_longitude' => $data['longitude'] ?? null,
            'arrival_at' => now(),
        ]);

        return $visit->fresh()->load(['assignedFieldOfficer', 'photos', 'project']);
    }

    public function saveMeasurementForm(
        SiteVisit $visit,
        User $user,
        array $formData,
        bool $allowPartial = false,
    ): SiteVisit {
        $this->assertAssignedFieldOfficer($visit, $user);
        $this->assertFormEditable($visit);

        $current = $this->visitStatusValue($visit);

        if (! in_array($current, [
            SiteVisitStatus::InProgress->value,
            SiteVisitStatus::MeasurementsCaptured->value,
        ], true)) {
            throw ValidationException::withMessages([
                'visit' => ["Cannot save measurements while visit status is {$current}."],
            ]);
        }

        $normalized = SiteMeasurementFormData::normalize($formData);

        if (! $allowPartial && ! SiteMeasurementFormData::hasOperationalData($normalized)) {
            throw ValidationException::withMessages([
                'form' => ['Add at least one measurement line or operational note.'],
            ]);
        }

        $update = [
            'measurement_form_data' => $normalized,
            'measurement_form_status' => MeasurementFormStatus::Draft->value,
        ];

        if (SiteMeasurementFormData::hasOperationalData($normalized)) {
            $update['status'] = SiteVisitStatus::MeasurementsCaptured->value;
        }

        $visit->update($update);

        return $visit->fresh()->load(['assignedFieldOfficer', 'photos', 'project']);
    }

    public function storeSketchPath(SiteVisit $visit, User $user, string $path): SiteVisit
    {
        $this->assertAssignedFieldOfficer($visit, $user);
        $this->assertFormEditable($visit);

        $visit->update(['rough_sketch_path' => $path]);

        return $visit->fresh();
    }

    public function submit(SiteVisit $visit, User $user, array $data): SiteVisit
    {
        $this->assertAssignedFieldOfficer($visit, $user);

        $current = $this->visitStatusValue($visit);
        $assessmentOnly = ! $this->visitRequiresMeasurements($visit);

        if ($current !== SiteVisitStatus::MeasurementsCaptured->value) {
            if (
                $current !== SiteVisitStatus::MeasurementsCaptured->value
                && ! ($assessmentOnly && $current === SiteVisitStatus::InProgress->value)
            ) {
                throw ValidationException::withMessages([
                    'visit' => ['Save measurements before marking the visit done.'],
                ]);
            }
        }

        if ($this->visitRequiresMeasurements($visit) && ! SiteMeasurementFormData::hasOperationalData($visit->measurement_form_data)) {
            throw ValidationException::withMessages([
                'form' => ['Complete the measurement form before submitting the visit.'],
            ]);
        }

        $visit->update([
            'status' => SiteVisitStatus::SubmittedForReview->value,
            'measurement_form_status' => MeasurementFormStatus::Submitted->value,
            'completion_at' => now(),
            'client_present' => $data['client_present'] ?? null,
            'visit_outcome' => $data['visit_outcome'] ?? null,
            'follow_up_required' => $data['follow_up_required'] ?? null,
            'field_officer_notes' => $data['field_officer_notes'] ?? null,
        ]);

        if ($visit->lead_id && $this->visitRequiresMeasurements($visit) && $this->isQuotationContext($visit)) {
            $lead = Lead::query()->find($visit->lead_id);
            $leadStatus = $lead?->status instanceof LeadStatus
                ? $lead->status->value
                : (string) ($lead?->status ?? '');

            if (in_array($leadStatus, [
                LeadStatus::SiteVisitScheduled->value,
                LeadStatus::SiteVisitRequired->value,
            ], true)) {
                $this->leadStageService->updateStatus(
                    $lead,
                    LeadStatus::MeasurementsCaptured->value,
                    $user,
                );
            }
        }

        return $visit->fresh()->load(['assignedFieldOfficer', 'photos', 'project']);
    }

    public function approve(SiteVisit $visit, User $user): SiteVisit
    {
        $current = $this->visitStatusValue($visit);

        if ($current !== SiteVisitStatus::SubmittedForReview->value) {
            throw ValidationException::withMessages([
                'visit' => ["Cannot approve a visit while status is {$current}."],
            ]);
        }

        $visit->update([
            'status' => SiteVisitStatus::Approved->value,
            'measurement_form_status' => MeasurementFormStatus::Locked->value,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        if ($this->isQuotationContext($visit)) {
            if ($visit->deal_id) {
                Deal::query()->whereKey($visit->deal_id)->update([
                    'stage' => DealStage::MeasurementsCompleted->value,
                ]);
            }

            if ($visit->account_id) {
                \App\Models\Account::query()->whereKey($visit->account_id)->update([
                    'status' => 'awaiting_quotation',
                ]);
            }
        }

        if ($this->isProductionContext($visit) && $visit->project_id) {
            $this->syncProductionMeasurementToProject($visit, $user);
        }

        $visit = $visit->fresh()->load(['assignedFieldOfficer', 'approvedBy', 'photos', 'project']);

        $this->crmAudit->siteVisitApproved($visit, $user);

        return $visit;
    }

    protected function syncProductionMeasurementToProject(SiteVisit $visit, User $user): void
    {
        $project = Project::query()->find($visit->project_id);
        if (! $project) {
            return;
        }

        $stageData = is_array($project->stage_data) ? $project->stage_data : [];
        $formData = is_array($visit->measurement_form_data) ? $visit->measurement_form_data : [];

        $stageData['site_measurement'] = array_merge($formData, [
            'approved_visit_id' => $visit->id,
            'rough_sketch_path' => $visit->rough_sketch_path,
            'recorded_by' => $user->id,
            'recorded_at' => now()->toIso8601String(),
        ]);

        $project->update(['stage_data' => $stageData]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function assertValidScheduleContext(array $data, MeasurementContext $context): void
    {
        if ($context === MeasurementContext::Production) {
            if (empty($data['project_id'])) {
                throw ValidationException::withMessages([
                    'project_id' => ['A project is required for production measurement visits.'],
                ]);
            }

            return;
        }

        if (
            empty($data['lead_id'])
            && empty($data['deal_id'])
            && empty($data['account_id'])
        ) {
            throw ValidationException::withMessages([
                'lead_id' => ['A lead, deal, or account is required for quotation measurement visits.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function buildDefaultFormData(array $data, User $user): array
    {
        $defaults = [
            'measured_at' => now()->toDateString(),
            'measured_by' => $user->name,
            'site_rep' => $user->name,
            'lines' => [],
        ];

        if (! empty($data['project_id'])) {
            $project = Project::query()->with(['account', 'contact'])->find($data['project_id']);
            if ($project) {
                $location = ProjectSiteLocation::resolve($project);
                $defaults['project_name'] = $project->name;
                $defaults['project_address'] = $location['site_address'] ?? $project->site_address;
                $defaults['client_name'] = $project->account?->name;
                $defaults['client_contact'] = $project->contact?->name;
                $defaults['phone'] = $project->contact?->phone;
            }
        }

        if (! empty($data['lead_id'])) {
            $lead = Lead::query()->find($data['lead_id']);
            if ($lead) {
                $defaults['client_name'] = $defaults['client_name'] ?? $lead->name ?? $lead->account_name;
                $defaults['project_address'] = $defaults['project_address'] ?? $lead->site_address;
                $defaults['phone'] = $defaults['phone'] ?? $lead->phone;
            }
        }

        if (! empty($data['account_id'])) {
            $account = \App\Models\Account::query()->with('primaryContact')->find($data['account_id']);
            if ($account) {
                $defaults['client_name'] = $defaults['client_name'] ?? $account->name;
                $defaults['client_contact'] = $defaults['client_contact'] ?? $account->primaryContact?->name;
                $defaults['phone'] = $defaults['phone'] ?? $account->primaryContact?->phone;
            }
        }

        $defaults['project_address'] = $defaults['project_address'] ?? ($data['site_address'] ?? null);

        return SiteMeasurementFormData::normalize($defaults);
    }

    protected function assertFormEditable(SiteVisit $visit): void
    {
        $status = $visit->measurement_form_status instanceof MeasurementFormStatus
            ? $visit->measurement_form_status->value
            : (string) ($visit->measurement_form_status ?? MeasurementFormStatus::Draft->value);

        if (in_array($status, [
            MeasurementFormStatus::Submitted->value,
            MeasurementFormStatus::Approved->value,
            MeasurementFormStatus::Locked->value,
        ], true)) {
            throw ValidationException::withMessages([
                'form' => ['This measurement form is read-only.'],
            ]);
        }
    }

    protected function isQuotationContext(SiteVisit $visit): bool
    {
        $context = $visit->measurement_context instanceof MeasurementContext
            ? $visit->measurement_context->value
            : (string) ($visit->measurement_context ?? MeasurementContext::Quotation->value);

        return $context === MeasurementContext::Quotation->value;
    }

    protected function isProductionContext(SiteVisit $visit): bool
    {
        return ! $this->isQuotationContext($visit);
    }

    protected function assertAssignedFieldOfficer(SiteVisit $visit, User $user): void
    {
        if ((int) $visit->assigned_field_officer_id !== $user->id && ! $user->can('site_visits.view_all')) {
            throw ValidationException::withMessages([
                'visit' => ['You are not the assigned user for this site visit.'],
            ]);
        }
    }

    protected function visitStatusValue(SiteVisit $visit): string
    {
        return $visit->status instanceof SiteVisitStatus
            ? $visit->status->value
            : (string) $visit->status;
    }

    protected function visitRequiresMeasurements(SiteVisit $visit): bool
    {
        if (isset($visit->requires_measurements)) {
            return (bool) $visit->requires_measurements;
        }

        return $this->purposeRequiresMeasurements($visit->visit_purpose);
    }

    protected function purposeRequiresMeasurements(?string $purpose): bool
    {
        return ! in_array($purpose, ['assessment', 'inspection', 'follow_up', 'client_meeting'], true);
    }
}
