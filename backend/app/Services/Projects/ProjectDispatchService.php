<?php

namespace App\Services\Projects;

use App\Enums\ProjectStage;
use App\Enums\Projects\ProjectDispatchStatus;
use App\Models\Procurement\Driver;
use App\Models\Project;
use App\Models\Projects\ProjectDispatch;
use App\Models\User;
use App\Services\Procurement\DriverOccupancyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectDispatchService
{
    public function __construct(
        protected DriverOccupancyService $occupancy,
        protected ProjectStageService $stages,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function dispatchToSite(Project $project, User $actor, int $driverId, array $data = []): ProjectDispatch
    {
        return DB::transaction(function () use ($project, $actor, $driverId, $data) {
            $driver = Driver::query()->findOrFail($driverId);
            $this->occupancy->assertAvailable($driver);

            $openExists = ProjectDispatch::query()
                ->where('project_id', $project->id)
                ->whereIn('status', [
                    ProjectDispatchStatus::Scheduled->value,
                    ProjectDispatchStatus::InTransit->value,
                ])
                ->exists();

            if ($openExists) {
                throw ValidationException::withMessages([
                    'project_id' => ['Project already has an open dispatch.'],
                ]);
            }

            $dispatch = ProjectDispatch::query()->create([
                'project_id' => $project->id,
                'driver_id' => $driver->id,
                'status' => ProjectDispatchStatus::InTransit->value,
                'vehicle_reg' => $data['vehicle_reg'] ?? $driver->vehicle_registration,
                'vehicle_details' => $data['vehicle_details'] ?? null,
                'dispatched_at' => now(),
                'packing_notes' => $data['packing_notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            $this->occupancy->occupy($driver, $data['reason'] ?? 'project_dispatch');

            $project = $project->fresh();
            if ($this->stages->currentStage($project) !== ProjectStage::InTransit) {
                $this->stages->transition($project, ProjectStage::InTransit, $actor, [
                    'reason' => $data['reason'] ?? null,
                    'force' => (bool) ($data['force'] ?? false),
                    'stage_data' => is_array($data['stage_data'] ?? null) ? $data['stage_data'] : [],
                ]);
            }

            return $dispatch->fresh(['driver', 'project', 'creator']);
        });
    }

    public function markDelivered(ProjectDispatch $dispatch): ProjectDispatch
    {
        return DB::transaction(function () use ($dispatch) {
            $dispatch = $dispatch->fresh(['driver']) ?? $dispatch;

            if ($dispatch->status === ProjectDispatchStatus::Delivered) {
                return $dispatch;
            }

            if ($dispatch->status === ProjectDispatchStatus::Cancelled) {
                throw ValidationException::withMessages([
                    'status' => ['Cancelled dispatches cannot be marked delivered.'],
                ]);
            }

            $dispatch->forceFill([
                'status' => ProjectDispatchStatus::Delivered->value,
                'delivered_at' => now(),
            ])->save();

            if ($dispatch->driver) {
                $this->occupancy->release($dispatch->driver);
            }

            return $dispatch->fresh(['driver', 'project', 'creator']);
        });
    }

    public function completeOpenDispatchesForProject(Project $project): void
    {
        $open = ProjectDispatch::query()
            ->where('project_id', $project->id)
            ->whereIn('status', [
                ProjectDispatchStatus::Scheduled->value,
                ProjectDispatchStatus::InTransit->value,
            ])
            ->get();

        foreach ($open as $dispatch) {
            $this->markDelivered($dispatch);
        }
    }
}
