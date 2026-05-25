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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SiteVisitWorkflowService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function schedule(User $user, array $data): SiteVisit
    {
        return DB::transaction(function () use ($user, $data) {
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
                'status' => SiteVisitStatus::Scheduled->value,
                'notes_for_field_officer' => $data['notes_for_field_officer'] ?? null,
            ]);

            if ($visit->lead_id) {
                Lead::query()->whereKey($visit->lead_id)->update([
                    'status' => LeadStatus::SiteVisitScheduled->value,
                ]);
            }

            if ($visit->deal_id) {
                Deal::query()->whereKey($visit->deal_id)->update([
                    'stage' => DealStage::SiteVisitPending->value,
                ]);
            }

            return $visit->load(['lead', 'deal', 'assignedFieldOfficer']);
        });
    }

    public function start(SiteVisit $visit, User $user, array $data): SiteVisit
    {
        if ((int) $visit->assigned_field_officer_id !== $user->id && ! $user->can('site_visits.view_all')) {
            throw ValidationException::withMessages([
                'visit' => ['You are not assigned to this site visit.'],
            ]);
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
        $visit->update([
            'status' => SiteVisitStatus::SubmittedForReview->value,
            'completion_at' => now(),
            'client_present' => $data['client_present'] ?? null,
            'visit_outcome' => $data['visit_outcome'] ?? null,
            'follow_up_required' => $data['follow_up_required'] ?? null,
            'field_officer_notes' => $data['field_officer_notes'] ?? null,
        ]);

        if ($visit->lead_id) {
            Lead::query()->whereKey($visit->lead_id)->update([
                'status' => LeadStatus::MeasurementsCaptured->value,
            ]);
        }

        return $visit->fresh()->load('measurementLines');
    }

    public function approve(SiteVisit $visit, User $user): SiteVisit
    {
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

        $visit = $visit->fresh()->load(['measurementLines', 'approvedBy']);

        $this->crmAudit->siteVisitApproved($visit, $user);

        return $visit;
    }
}
