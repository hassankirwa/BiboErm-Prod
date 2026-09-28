<?php

namespace App\Services\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\FieldInstallation\FieldJobType;
use App\Enums\InstallMode;
use App\Enums\ProjectStage;
use App\Events\FieldInstallation\FieldInstallationCompleted;
use App\Events\FieldInstallation\FieldInstallationJobStarted;
use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationJobMember;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\ToolIssuance;
use App\Services\Projects\ProjectStageService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldInstallationJobService
{
    public function __construct(
        protected FieldInstallationReferenceGenerator $references,
        protected FieldInstallationAuditLogger $audit,
        protected FieldUnitProgressService $unitProgress,
        protected ProjectStageService $projectStages,
    ) {}

    public function create(User $actor, array $data): FieldInstallationJob
    {
        $project = Project::query()->findOrFail($data['project_id']);
        $waveId = isset($data['project_wave_id']) ? (int) $data['project_wave_id'] : null;
        $this->assertCanCreateForProject($project, $waveId);

        return DB::transaction(function () use ($actor, $data, $project, $waveId) {
            $jobType = $this->resolveJobType($project, $data['job_type'] ?? null);
            $productionOrderId = $data['production_order_id']
                ?? ProductionOrder::query()
                    ->where('project_id', $project->id)
                    ->when(
                        $waveId !== null,
                        fn ($q) => $q->where('project_wave_id', $waveId),
                        fn ($q) => $q->whereNull('project_wave_id'),
                    )
                    ->latest('id')
                    ->value('id')
                ?? ProductionOrder::query()
                    ->where('project_id', $project->id)
                    ->latest('id')
                    ->value('id');

            $job = FieldInstallationJob::query()->create([
                'reference' => $this->references->next(),
                'project_id' => $project->id,
                'project_wave_id' => $waveId,
                'production_order_id' => $productionOrderId,
                'job_type' => $jobType,
                'status' => FieldJobStatus::Scheduled,
                'team_lead_id' => $data['team_lead_id'] ?? $actor->id,
                'scheduled_start' => $data['scheduled_start'] ?? null,
                'scheduled_end' => $data['scheduled_end'] ?? null,
                'site_address' => $data['site_address'] ?? $project->site_address,
                'site_contact_name' => $data['site_contact_name'] ?? null,
                'site_contact_phone' => $data['site_contact_phone'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            if (! empty($data['member_ids']) && is_array($data['member_ids'])) {
                foreach ($data['member_ids'] as $memberId) {
                    $this->assignMember($job, (int) $memberId, 'engineer', $actor);
                }
            }

            $this->audit->log('field.job_created', $job, newValues: [
                'reference' => $job->reference,
                'project_id' => $job->project_id,
                'job_type' => $job->job_type->value,
            ]);

            return $job->fresh(['project', 'teamLead', 'activeMembers.user']);
        });
    }

    public function update(FieldInstallationJob $job, array $data): FieldInstallationJob
    {
        $job->update(collect($data)->only([
            'team_lead_id',
            'scheduled_start',
            'scheduled_end',
            'site_address',
            'site_contact_name',
            'site_contact_phone',
            'notes',
        ])->filter(fn ($value) => $value !== null)->all());

        return $job->fresh(['project', 'teamLead', 'activeMembers.user']);
    }

    public function start(FieldInstallationJob $job, User $actor): FieldInstallationJob
    {
        if ($job->status !== FieldJobStatus::Scheduled) {
            throw ValidationException::withMessages([
                'status' => ['Only scheduled jobs can be started.'],
            ]);
        }

        $hasFieldAssignment = $job->toolAssignments()->exists();
        $hasOpenProjectIssuance = ToolIssuance::query()
            ->where('project_id', $job->project_id)
            ->whereNull('return_date')
            ->exists();

        if (! $hasFieldAssignment && ! $hasOpenProjectIssuance) {
            throw ValidationException::withMessages([
                'tools' => ['Warehouse must allocate equipment to this project before starting.'],
            ]);
        }

        return DB::transaction(function () use ($job, $actor) {
            $job->update([
                'status' => FieldJobStatus::InProgress,
                'actual_start' => now(),
            ]);

            $this->unitProgress->generateFromMeasurements($job);

            if ($job->project_wave_id) {
                \App\Models\ProjectWave::query()->whereKey($job->project_wave_id)->update([
                    'status' => \App\Enums\Projects\ProjectWaveStatus::Installing->value,
                ]);
            }

            event(new FieldInstallationJobStarted(
                jobId: $job->id,
                projectId: $job->project_id,
                startedByUserId: $actor->id,
            ));

            $this->audit->log('field.job_started', $job, newValues: ['status' => FieldJobStatus::InProgress->value]);

            return $job->fresh(['project', 'units', 'activeMembers.user']);
        });
    }

    public function complete(FieldInstallationJob $job, User $actor): FieldInstallationJob
    {
        if ($job->status === FieldJobStatus::Completed) {
            return $job->fresh(['project', 'units', 'toolAssignments.toolIssuance']) ?? $job;
        }

        if ($job->status !== FieldJobStatus::InProgress && $job->status !== FieldJobStatus::OnHold) {
            throw ValidationException::withMessages([
                'status' => ['Job must be in progress or on hold to complete.'],
            ]);
        }

        $this->assertAllUnitsComplete($job);
        $this->assertAllToolsReturned($job);

        return DB::transaction(function () use ($job, $actor) {
            $locked = FieldInstallationJob::query()
                ->whereKey($job->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status === FieldJobStatus::Completed) {
                return $locked->fresh(['project', 'units', 'toolAssignments.toolIssuance']);
            }

            if ($locked->status !== FieldJobStatus::InProgress && $locked->status !== FieldJobStatus::OnHold) {
                throw ValidationException::withMessages([
                    'status' => ['Job must be in progress or on hold to complete.'],
                ]);
            }

            $locked->update([
                'status' => FieldJobStatus::Completed,
                'actual_end' => now(),
                'percent_complete' => 100,
            ]);

            event(new FieldInstallationCompleted(
                jobId: $locked->id,
                projectId: $locked->project_id,
                completedByUserId: $actor->id,
            ));

            $this->audit->log('field.job_completed', $locked, newValues: ['status' => FieldJobStatus::Completed->value]);

            if ($locked->project_wave_id) {
                $wave = \App\Models\ProjectWave::query()->find($locked->project_wave_id);
                if ($wave) {
                    $wave->status = \App\Enums\Projects\ProjectWaveStatus::Complete;
                    $wave->completion_percent = 100;
                    $wave->save();
                }
                app(\App\Services\Projects\ProjectWaveService::class)->refreshProgress(
                    Project::query()->findOrFail($locked->project_id)
                );
            }

            return $locked->fresh(['project', 'units', 'toolAssignments.toolIssuance']);
        });
    }

    public function cancel(FieldInstallationJob $job, User $actor): FieldInstallationJob
    {
        if (! in_array($job->status, [FieldJobStatus::Scheduled, FieldJobStatus::OnHold], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only scheduled or on-hold jobs can be cancelled.'],
            ]);
        }

        $job->update(['status' => FieldJobStatus::Cancelled]);

        $this->audit->log('field.job_completed', $job, newValues: [
            'status' => FieldJobStatus::Cancelled->value,
            'cancelled_by' => $actor->id,
        ]);

        return $job->fresh();
    }

    public function hold(FieldInstallationJob $job, User $actor): FieldInstallationJob
    {
        if ($job->status !== FieldJobStatus::InProgress) {
            throw ValidationException::withMessages([
                'status' => ['Only in-progress jobs can be put on hold.'],
            ]);
        }

        $job->update(['status' => FieldJobStatus::OnHold]);

        $this->audit->log('field.job_on_hold', $job, newValues: [
            'status' => FieldJobStatus::OnHold->value,
            'held_by' => $actor->id,
        ]);

        return $job->fresh(['project', 'teamLead', 'activeMembers.user']);
    }

    public function assignMember(
        FieldInstallationJob $job,
        int $userId,
        string $role,
        User $assignedBy,
    ): FieldInstallationJobMember {
        return FieldInstallationJobMember::query()->updateOrCreate(
            [
                'job_id' => $job->id,
                'user_id' => $userId,
            ],
            [
                'role' => $role,
                'assigned_at' => now(),
                'assigned_by' => $assignedBy->id,
                'removed_at' => null,
            ],
        );
    }

    public function removeMember(FieldInstallationJob $job, int $userId): void
    {
        FieldInstallationJobMember::query()
            ->where('job_id', $job->id)
            ->where('user_id', $userId)
            ->whereNull('removed_at')
            ->update(['removed_at' => now()]);
    }

    public function assertCanCreateForProject(Project $project, ?int $projectWaveId = null): void
    {
        $installMode = $project->install_mode instanceof InstallMode
            ? $project->install_mode
            : InstallMode::tryFrom((string) $project->install_mode);

        if ($installMode === InstallMode::NairobiFabricationOnly) {
            throw ValidationException::withMessages([
                'project_id' => ['Field installation is not required for fabrication-only projects.'],
            ]);
        }

        if (! $this->canStartFieldInstallation($project, $installMode)) {
            throw ValidationException::withMessages([
                'project_id' => [
                    $this->isNairobiEarlyEligible($project, $installMode)
                        ? 'Nairobi early site install requires sash fabrication to be completed first.'
                        : 'Project must be at qc_pre_installation stage or later.',
                ],
            ]);
        }

        $query = FieldInstallationJob::query()
            ->where('project_id', $project->id)
            ->whereIn('status', [
                FieldJobStatus::Scheduled->value,
                FieldJobStatus::InProgress->value,
                FieldJobStatus::OnHold->value,
            ]);

        if ($projectWaveId === null) {
            $query->whereNull('project_wave_id');
        } else {
            $query->where('project_wave_id', $projectWaveId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'project_id' => [
                    $projectWaveId
                        ? 'This wave already has an active field installation job.'
                        : 'Project already has an active field installation job.',
                ],
            ]);
        }
    }

    /**
     * Outside Nairobi: full QC pre-installation gate.
     * Nairobi site install: allow early field job once sash fabrication is done
     * (factory continues into glass assembly / finishing in parallel).
     */
    public function canStartFieldInstallation(Project $project, ?InstallMode $installMode = null): bool
    {
        $installMode ??= $project->install_mode instanceof InstallMode
            ? $project->install_mode
            : InstallMode::tryFrom((string) $project->install_mode);

        if ($this->projectStageAtLeast($project, ProjectStage::QcPreInstallation)) {
            return true;
        }

        return $this->isNairobiEarlyEligible($project, $installMode)
            && $this->hasCompletedSash($project);
    }

    public function isNairobiEarlyEligible(Project $project, ?InstallMode $installMode = null): bool
    {
        $installMode ??= $project->install_mode instanceof InstallMode
            ? $project->install_mode
            : InstallMode::tryFrom((string) $project->install_mode);

        if ($installMode === InstallMode::NairobiSiteInstall) {
            return true;
        }

        return ($project->location_type ?? null) === 'nairobi'
            && $installMode !== InstallMode::OutsideFullInstall
            && $installMode !== InstallMode::NairobiFabricationOnly;
    }

    protected function hasCompletedSash(Project $project): bool
    {
        if ($this->projectStageAtLeast($project, ProjectStage::GlassAssembly)
            || $this->projectStageAtLeast($project, ProjectStage::QcPreInstallation)) {
            return true;
        }

        return ProductionOrder::query()
            ->where('project_id', $project->id)
            ->whereHas('stageLogs', function ($query) {
                $query->where('stage', 'sash')
                    ->where('status', 'completed');
            })
            ->exists();
    }

    protected function assertAllUnitsComplete(FieldInstallationJob $job): void
    {
        $this->unitProgress->ensureMeasurementUnits($job);
        $job->refresh();

        if ($job->units()->count() < 1) {
            throw ValidationException::withMessages([
                'units' => ['No measured openings to install. Approve site measurements before completing.'],
            ]);
        }

        $pending = $job->units()
            ->whereNotIn('status', [
                FieldUnitStatus::Installed->value,
                FieldUnitStatus::Waived->value,
            ])
            ->count();

        if ($pending > 0) {
            throw ValidationException::withMessages([
                'units' => ['All installation units must be installed or waived before completing the job.'],
            ]);
        }

        $allDone = $job->units()
            ->whereIn('status', [
                FieldUnitStatus::Installed->value,
                FieldUnitStatus::Waived->value,
            ])
            ->count() === $job->units()->count();

        if ((float) $job->percent_complete < 100 && ! $allDone) {
            throw ValidationException::withMessages([
                'units' => ['All installation units must be installed or waived before completing the job.'],
            ]);
        }
    }

    protected function assertAllToolsReturned(FieldInstallationJob $job): void
    {
        // Open = still on site: no returned_at and issuance not closed.
        // Lost/retired returns close the issuance and set returned_at, so they do not block complete.
        $open = $job->toolAssignments()
            ->whereNull('returned_at')
            ->where(function ($query): void {
                $query->whereDoesntHave('toolIssuance')
                    ->orWhereHas('toolIssuance', function ($issuance): void {
                        $issuance->whereNull('return_date')
                            // Non-returnable consumables (nails, etc.) never block completion.
                            ->whereHas('tool', fn ($tool) => $tool->where('is_returnable', true));
                    });
            })
            ->count();

        if ($open > 0) {
            throw ValidationException::withMessages([
                'tools' => ['Return or mark remaining on-site tools as lost before completing the job.'],
            ]);
        }
    }

    protected function resolveJobType(Project $project, ?string $requested): FieldJobType
    {
        if ($requested) {
            return FieldJobType::from($requested);
        }

        $installMode = $project->install_mode instanceof InstallMode
            ? $project->install_mode
            : InstallMode::tryFrom((string) $project->install_mode);

        return match ($installMode) {
            InstallMode::OutsideFullInstall => FieldJobType::OutsideFullInstall,
            default => FieldJobType::NairobiSiteInstall,
        };
    }

    protected function projectStageAtLeast(Project $project, ProjectStage $minimum): bool
    {
        $current = $this->projectStages->currentStage($project);
        $stages = [
            ProjectStage::AwaitingDeposit,
            ProjectStage::DepositReceived,
            ProjectStage::SiteAssessment,
            ProjectStage::FinalDesignApproval,
            ProjectStage::BomFinalized,
            ProjectStage::MaterialCheck,
            ProjectStage::MaterialsReserved,
            ProjectStage::AwaitingProcurement,
            ProjectStage::MaterialsReady,
            ProjectStage::MaterialsReleased,
            ProjectStage::CuttingStage,
            ProjectStage::FabricationStage,
            ProjectStage::GlassAssembly,
            ProjectStage::QcPreInstallation,
            ProjectStage::InTransit,
            ProjectStage::Installation,
            ProjectStage::SiteQc,
            ProjectStage::Snagging,
            ProjectStage::ProjectComplete,
        ];

        $currentIndex = array_search($current, $stages, true);
        $minimumIndex = array_search($minimum, $stages, true);

        if ($currentIndex === false || $minimumIndex === false) {
            return false;
        }

        return $currentIndex >= $minimumIndex;
    }
}
