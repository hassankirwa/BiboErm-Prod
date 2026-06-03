<?php

namespace App\Services\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Events\FieldInstallation\FieldInstallationDailyLogSubmitted;
use App\Models\FieldInstallation\FieldInstallationDailyLog;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldDailyLogService
{
    public function __construct(
        protected FieldInstallationAuditLogger $audit,
        protected FieldUnitProgressService $unitProgress,
    ) {}

    public function submit(FieldInstallationJob $job, User $actor, array $data): FieldInstallationDailyLog
    {
        if (! in_array($job->status, [FieldJobStatus::InProgress, FieldJobStatus::OnHold], true)) {
            throw ValidationException::withMessages([
                'job' => ['Daily logs can only be submitted for active jobs.'],
            ]);
        }

        return DB::transaction(function () use ($job, $actor, $data) {
            $log = FieldInstallationDailyLog::query()->create([
                'job_id' => $job->id,
                'log_date' => $data['log_date'] ?? now()->toDateString(),
                'submitted_by' => $actor->id,
                'summary' => $data['summary'],
                'units_completed' => (int) ($data['units_completed'] ?? 0),
                'percent_today' => $data['percent_today'] ?? null,
                'weather' => $data['weather'] ?? null,
                'site_conditions' => $data['site_conditions'] ?? null,
                'blockers' => $data['blockers'] ?? null,
                'submitted_at' => now(),
            ]);

            if (! empty($data['units_completed'])) {
                $this->unitProgress->recalculateJobPercent($job);
            }

            event(new FieldInstallationDailyLogSubmitted(
                jobId: $job->id,
                projectId: $job->project_id,
                dailyLogId: $log->id,
                submittedByUserId: $actor->id,
            ));

            $this->audit->log('field.daily_log_submitted', $log, newValues: [
                'log_date' => $log->log_date?->toDateString(),
                'submitted_by' => $actor->id,
            ]);

            return $log->fresh('submitter');
        });
    }
}
