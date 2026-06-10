<?php

namespace App\Services\Design;

use App\Enums\Design\DesignJobStatus;
use App\Models\DesignJob;
use App\Models\MeasurementReport;
use App\Models\SiteVisit;
use App\Models\User;
use Illuminate\Support\Str;

class DesignJobService
{
    public function createFromApprovedVisit(
        SiteVisit $visit,
        MeasurementReport $report,
        User $user,
    ): DesignJob {
        return DesignJob::query()->create([
            'design_job_number' => 'DJ-'.strtoupper(Str::random(8)),
            'lead_id' => $visit->lead_id,
            'site_visit_id' => $visit->id,
            'measurement_report_id' => $report->id,
            'status' => DesignJobStatus::DesignRequired->value,
        ]);
    }

    public function assignDesigner(DesignJob $job, User $designer, User $actor): DesignJob
    {
        $job->update([
            'assigned_designer_id' => $designer->id,
            'status' => DesignJobStatus::Assigned->value,
        ]);

        return $job->fresh()->load(['assignedDesigner', 'measurementReport', 'lead']);
    }

    public function markPackageDownloaded(DesignJob $job, User $user): DesignJob
    {
        $job->update([
            'downloaded_at' => now(),
            'status' => DesignJobStatus::PackageDownloaded->value,
        ]);

        return $job->fresh();
    }

    public function markDesignStarted(DesignJob $job, User $user): DesignJob
    {
        $job->update([
            'design_started_at' => $job->design_started_at ?? now(),
            'status' => DesignJobStatus::WincadInProgress->value,
        ]);

        return $job->fresh();
    }

    public function markFilesUploaded(DesignJob $job, User $user): DesignJob
    {
        $job->update([
            'uploaded_at' => now(),
            'status' => DesignJobStatus::FilesUploaded->value,
        ]);

        return $job->fresh();
    }

    public function approve(DesignJob $job, User $reviewer, ?string $notes = null): DesignJob
    {
        $job->update([
            'reviewed_at' => now(),
            'approved_at' => now(),
            'review_notes' => $notes,
            'status' => DesignJobStatus::ReadyForQuotation->value,
        ]);

        return $job->fresh()->load(['files', 'extractedItems', 'lead']);
    }
}
