<?php

namespace App\Services\Crm\SiteVisits;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\MeasurementLine;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Crm\Leads\LeadStageService;
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
            if (empty($data['assigned_field_officer_id']) && ! empty($data['deal_id'])) {
                $deal = Deal::query()->find($data['deal_id']);
                if ($deal?->assigned_field_officer_id) {
                    $data['assigned_field_officer_id'] = $deal->assigned_field_officer_id;
                }
            }

            $visit = SiteVisit::query()->create([
                'visit_number' => 'SV-'.strtoupper(Str::random(8)),
                'title' => $data['title'],
                'lead_id' => $data['lead_id'] ?? null,
                'deal_id' => $data['deal_id'] ?? null,
                'account_id' => $data['account_id'] ?? null,
                'contact_id' => $data['contact_id'] ?? null,
                'site_address' => $data['site_address'] ?? null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'assigned_field_officer_id' => $data['assigned_field_officer_id'],
                'scheduled_by' => $user->id,
                'visit_date' => $data['visit_date'],
                'visit_time' => $data['visit_time'] ?? null,
                'visit_purpose' => $data['visit_purpose'] ?? null,
                'requires_measurements' => $data['requires_measurements'] ?? $this->purposeRequiresMeasurements($data['visit_purpose'] ?? null),
                'status' => SiteVisitStatus::Scheduled->value,
                'notes_for_field_officer' => $data['notes_for_field_officer'] ?? null,
            ]);

            if ($visit->lead_id) {
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

            return $visit->load(['lead', 'deal', 'assignedFieldOfficer']);
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
            return $visit->fresh()->load(['measurementLines', 'assignedFieldOfficer']);
        }

        $visit->update([
            'status' => SiteVisitStatus::InProgress->value,
            'actual_latitude' => $data['latitude'] ?? null,
            'actual_longitude' => $data['longitude'] ?? null,
            'arrival_at' => now(),
        ]);

        return $visit->fresh()->load(['measurementLines', 'assignedFieldOfficer']);
    }

    public function storeMeasurements(SiteVisit $visit, User $user, array $lines): SiteVisit
    {
        $this->assertAssignedFieldOfficer($visit, $user);

        $current = $this->visitStatusValue($visit);

        if (! in_array($current, [
            SiteVisitStatus::InProgress->value,
            SiteVisitStatus::MeasurementsCaptured->value,
        ], true)) {
            throw ValidationException::withMessages([
                'visit' => ["Cannot save measurements while visit status is {$current}."],
            ]);
        }

        DB::transaction(function () use ($visit, $lines) {
            $visit->measurementLines()->delete();

            foreach ($lines as $index => $line) {
                MeasurementLine::query()->create([
                    'site_visit_id' => $visit->id,
                    'room_area_name' => $line['room_area_name'],
                    'width' => $line['width'] ?? null,
                    'height' => $line['height'] ?? null,
                    'quantity' => $line['quantity'] ?? 1,
                    'material_preference' => $line['material_preference'] ?? null,
                    'installation_notes' => $line['installation_notes'] ?? null,
                    'obstacles_notes' => $line['obstacles_notes'] ?? null,
                    'client_comments' => $line['client_comments'] ?? null,
                    'sort_order' => $line['sort_order'] ?? $index,
                ]);
            }

            $visit->update(['status' => SiteVisitStatus::MeasurementsCaptured->value]);
        });

        return $visit->fresh()->load('measurementLines');
    }

    public function submit(SiteVisit $visit, User $user, array $data): SiteVisit
    {
        $this->assertAssignedFieldOfficer($visit, $user);

        $current = $this->visitStatusValue($visit);

        $assessmentOnly = ! $this->visitRequiresMeasurements($visit);

        if ($current !== SiteVisitStatus::MeasurementsCaptured->value) {
            if ($visit->deal_id) {
                $deal = Deal::query()->find($visit->deal_id);
                if ($deal?->site_assessment && $this->assessmentHasMeasurableData($deal->site_assessment)) {
                    $visit = $this->syncDealAssessmentToVisit($visit, $user, $deal->site_assessment);
                    $current = $this->visitStatusValue($visit);
                }
            }

            if (
                $current !== SiteVisitStatus::MeasurementsCaptured->value
                && ! ($assessmentOnly && $current === SiteVisitStatus::InProgress->value)
            ) {
                throw ValidationException::withMessages([
                    'visit' => ['Save measurements before marking the visit done.'],
                ]);
            }
        }

        if ($this->visitRequiresMeasurements($visit) && $visit->measurementLines()->count() === 0) {
            throw ValidationException::withMessages([
                'lines' => ['At least one measurement line is required before submitting the visit.'],
            ]);
        }

        $visit->update([
            'status' => SiteVisitStatus::SubmittedForReview->value,
            'completion_at' => now(),
            'client_present' => $data['client_present'] ?? null,
            'visit_outcome' => $data['visit_outcome'] ?? null,
            'follow_up_required' => $data['follow_up_required'] ?? null,
            'field_officer_notes' => $data['field_officer_notes'] ?? null,
        ]);

        if ($visit->lead_id && $this->visitRequiresMeasurements($visit)) {
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

        return $visit->fresh()->load('measurementLines');
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
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

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

        $visit = $visit->fresh()->load(['measurementLines', 'approvedBy']);

        $this->crmAudit->siteVisitApproved($visit, $user);

        return $visit;
    }

    /**
     * @param  array<string, mixed>  $assessment
     */
    public function syncDealAssessmentToVisit(SiteVisit $visit, User $user, array $assessment): SiteVisit
    {
        $lines = $this->measurementLinesFromDealAssessment($assessment);
        if ($lines === []) {
            return $visit->fresh()->load('measurementLines');
        }

        $current = $this->visitStatusValue($visit);
        if (in_array($current, [
            SiteVisitStatus::Scheduled->value,
            SiteVisitStatus::Assigned->value,
        ], true)) {
            $visit->update([
                'status' => SiteVisitStatus::InProgress->value,
                'arrival_at' => $visit->arrival_at ?? now(),
            ]);
            $visit = $visit->fresh();
        }

        return $this->storeMeasurements($visit, $user, $lines);
    }

    /**
     * @param  array<string, mixed>  $assessment
     */
    public function assessmentHasMeasurableData(array $assessment): bool
    {
        if (($assessment['doors_count'] ?? 0) > 0 || ($assessment['windows_count'] ?? 0) > 0) {
            return true;
        }

        if (($assessment['balconies_count'] ?? 0) > 0 || ($assessment['bathrooms_count'] ?? 0) > 0) {
            return true;
        }

        foreach (['doors', 'windows', 'balconies', 'bathrooms'] as $key) {
            foreach ($assessment[$key] ?? [] as $item) {
                if (! empty($item['label'])) {
                    return true;
                }
            }
        }

        return trim((string) ($assessment['operational_notes'] ?? '')) !== ''
            || trim((string) ($assessment['access_constraints'] ?? '')) !== ''
            || trim((string) ($assessment['fabrication_concerns'] ?? '')) !== '';
    }

    /**
     * @param  array<string, mixed>  $assessment
     * @return list<array<string, mixed>>
     */
    protected function measurementLinesFromDealAssessment(array $assessment): array
    {
        $lines = [];
        $order = 0;

        foreach ($assessment['doors'] ?? [] as $door) {
            $label = trim((string) ($door['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $lines[] = [
                'room_area_name' => $label,
                'width' => $door['width_ft'] ?? null,
                'height' => $door['height_ft'] ?? null,
                'quantity' => 1,
                'material_preference' => $door['material_preference'] ?? null,
                'installation_notes' => $door['notes'] ?? null,
                'sort_order' => $order++,
            ];
        }

        foreach ($assessment['windows'] ?? [] as $window) {
            $label = trim((string) ($window['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $lines[] = [
                'room_area_name' => $label,
                'width' => $window['width_ft'] ?? null,
                'height' => $window['height_ft'] ?? null,
                'quantity' => 1,
                'material_preference' => $window['material_preference'] ?? null,
                'installation_notes' => $window['notes'] ?? null,
                'sort_order' => $order++,
            ];
        }

        foreach (['balconies' => 'Balcony', 'bathrooms' => 'Bathroom'] as $key => $prefix) {
            foreach ($assessment[$key] ?? [] as $item) {
                $label = trim((string) ($item['label'] ?? ''));
                if ($label === '') {
                    continue;
                }
                $notes = trim(implode("\n", array_filter([
                    $item['notes'] ?? null,
                    $item['dimensions_description'] ?? null,
                ])));
                $lines[] = [
                    'room_area_name' => str_starts_with($label, $prefix) ? $label : "{$prefix}: {$label}",
                    'width' => $item['width_ft'] ?? null,
                    'height' => $item['height_ft'] ?? null,
                    'quantity' => 1,
                    'installation_notes' => $notes !== '' ? $notes : null,
                    'sort_order' => $order++,
                ];
            }
        }

        return $lines;
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
