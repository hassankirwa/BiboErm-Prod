<?php

namespace App\Services\Projects;

use App\Enums\Crm\SiteVisitStatus;
use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Enums\Projects\ProjectScopeType;
use App\Enums\Projects\ProjectWaveStatus;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\Project;
use App\Models\ProjectFloor;
use App\Models\ProjectScope;
use App\Models\ProjectWave;
use App\Models\SiteVisit;
use App\Support\SiteMeasurementFormData;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectWaveService
{
    /**
     * Ensure Wave 1 exists and bootstrap floor/room scopes from measurements + project_floors.
     *
     * @return array{wave: ProjectWave, scopes_created: int, floors_linked: int}
     */
    public function bootstrapFromMeasurements(Project $project, ?ProjectWave $wave = null): array
    {
        return DB::transaction(function () use ($project, $wave) {
            $wave ??= $this->ensurePrimaryWave($project);
            $lines = $this->measurementLines($project);
            $created = 0;
            $floorsLinked = 0;

            $floorLabels = [];
            foreach ($project->floors()->orderBy('sort_order')->get() as $floor) {
                $label = trim((string) $floor->floor_label);
                if ($label !== '') {
                    $floorLabels[mb_strtolower($label)] = $label;
                }
            }

            foreach ($lines as $line) {
                if (! is_array($line) || ! SiteMeasurementFormData::lineHasMeasurableData($line)) {
                    continue;
                }
                $unitFloor = $this->nullableTrim($line['unit_floor'] ?? null);
                if ($unitFloor === null) {
                    continue;
                }
                $floorLabels[mb_strtolower($unitFloor)] = $unitFloor;
            }

            $sort = 0;
            foreach ($floorLabels as $label) {
                [$floorScope, $floorCreated] = $this->findOrCreateFloorScope($project, $wave, $label, $sort++);
                if ($floorCreated) {
                    $created++;
                }

                $projectFloor = $this->ensureProjectFloor($project, $label, $floorScope);
                if ($projectFloor->project_scope_id !== $floorScope->id) {
                    $projectFloor->project_scope_id = $floorScope->id;
                    $projectFloor->save();
                    $floorsLinked++;
                }

                if ($floorScope->project_floor_id !== $projectFloor->id) {
                    $floorScope->project_floor_id = $projectFloor->id;
                    $floorScope->save();
                }

                $rooms = $this->roomsForFloor($lines, $label);
                $roomSort = 0;
                foreach ($rooms as $roomLabel) {
                    [, $roomCreated] = $this->findOrCreateRoomScope($project, $wave, $floorScope, $roomLabel, $roomSort++);
                    if ($roomCreated) {
                        $created++;
                    }
                }
            }

            $this->refreshProgress($project);

            return [
                'wave' => $wave->fresh(['scopes.children']),
                'scopes_created' => $created,
                'floors_linked' => $floorsLinked,
            ];
        });
    }

    /**
     * @param  array{label?: string|null, scope_ids?: list<int>}  $data
     */
    public function createWave(Project $project, array $data = []): ProjectWave
    {
        return DB::transaction(function () use ($project, $data) {
            $nextNumber = (int) ProjectWave::query()
                ->where('project_id', $project->id)
                ->max('wave_number') + 1;

            if ($nextNumber < 1) {
                $nextNumber = 1;
            }

            $label = trim((string) ($data['label'] ?? ''));
            if ($label === '') {
                $label = "Wave {$nextNumber}";
            }

            $wave = ProjectWave::query()->create([
                'project_id' => $project->id,
                'wave_number' => $nextNumber,
                'label' => $label,
                'status' => ProjectWaveStatus::Planned,
                'completion_percent' => 0,
            ]);

            $scopeIds = array_values(array_filter(array_map('intval', $data['scope_ids'] ?? [])));
            if ($scopeIds !== []) {
                $this->assignScopes($wave, $scopeIds);
            }

            return $wave->fresh(['scopes.children']);
        });
    }

    public function ensurePrimaryWave(Project $project): ProjectWave
    {
        $existing = ProjectWave::query()
            ->where('project_id', $project->id)
            ->orderBy('wave_number')
            ->first();

        if ($existing) {
            return $existing;
        }

        return ProjectWave::query()->create([
            'project_id' => $project->id,
            'wave_number' => 1,
            'label' => 'Wave 1',
            'status' => ProjectWaveStatus::Planned,
            'completion_percent' => 0,
        ]);
    }

    /**
     * Assign floor scopes (and their rooms) to a wave.
     *
     * @param  list<int>  $scopeIds
     */
    public function assignScopes(ProjectWave $wave, array $scopeIds): ProjectWave
    {
        $scopes = ProjectScope::query()
            ->where('project_id', $wave->project_id)
            ->whereIn('id', $scopeIds)
            ->get();

        if ($scopes->count() !== count(array_unique($scopeIds))) {
            throw ValidationException::withMessages([
                'scope_ids' => ['One or more scopes do not belong to this project.'],
            ]);
        }

        DB::transaction(function () use ($wave, $scopes) {
            foreach ($scopes as $scope) {
                $scope->project_wave_id = $wave->id;
                $scope->save();

                if ($scope->type === ProjectScopeType::Floor) {
                    ProjectScope::query()
                        ->where('parent_id', $scope->id)
                        ->update(['project_wave_id' => $wave->id]);
                }
            }
        });

        $this->refreshProgress($wave->project);

        return $wave->fresh(['scopes.children']);
    }

    /**
     * @return array{
     *     waves: list<array<string, mixed>>,
     *     floors: list<array<string, mixed>>,
     *     rooms: list<array<string, mixed>>
     * }
     */
    public function progressTree(Project $project): array
    {
        $this->refreshProgress($project);

        $waves = ProjectWave::query()
            ->where('project_id', $project->id)
            ->with(['scopes' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->orderBy('wave_number')
            ->get();

        $wavePayload = [];
        $floorPayload = [];
        $roomPayload = [];

        foreach ($waves as $wave) {
            $floors = $wave->scopes->filter(
                fn (ProjectScope $s) => $s->type === ProjectScopeType::Floor
            );
            $rooms = $wave->scopes->filter(
                fn (ProjectScope $s) => $s->type === ProjectScopeType::Room
            );

            $wavePayload[] = [
                'id' => $wave->id,
                'wave_number' => $wave->wave_number,
                'label' => $wave->label,
                'status' => $wave->status?->value ?? $wave->status,
                'stage' => $wave->stage,
                'completion_percent' => $wave->completion_percent,
                'floors' => $floors->map(fn (ProjectScope $floor) => $this->scopePayload($floor, $rooms))->values()->all(),
            ];

            foreach ($floors as $floor) {
                $floorPayload[] = $this->scopePayload($floor, $rooms) + [
                    'wave_id' => $wave->id,
                    'wave_number' => $wave->wave_number,
                ];
                foreach ($rooms->where('parent_id', $floor->id) as $room) {
                    $roomPayload[] = [
                        'id' => $room->id,
                        'label' => $room->label,
                        'room_key' => $room->room_key,
                        'parent_id' => $room->parent_id,
                        'floor_label' => $floor->label,
                        'wave_id' => $wave->id,
                        'completion_percent' => $room->completion_percent,
                        'openings_total' => $room->openings_total,
                        'openings_done' => $room->openings_done,
                        'stage' => $room->stage,
                    ];
                }
            }
        }

        return [
            'waves' => $wavePayload,
            'floors' => $floorPayload,
            'rooms' => $roomPayload,
        ];
    }

    public function refreshProgress(Project $project): void
    {
        $units = FieldInstallationUnit::query()
            ->whereHas('job', fn ($q) => $q->where('project_id', $project->id))
            ->get(['id', 'unit_floor', 'room_location', 'status', 'project_scope_id']);

        $scopes = ProjectScope::query()
            ->where('project_id', $project->id)
            ->get();

        foreach ($scopes->where('type', ProjectScopeType::Room) as $room) {
            $parent = $scopes->firstWhere('id', $room->parent_id);
            $floorLabel = $parent?->label;
            $matching = $units->filter(function (FieldInstallationUnit $unit) use ($room, $floorLabel) {
                if ($unit->project_scope_id && (int) $unit->project_scope_id === (int) $room->id) {
                    return true;
                }
                $unitFloor = mb_strtolower(trim((string) $unit->unit_floor));
                $unitRoom = mb_strtolower(trim((string) $unit->room_location));

                return $floorLabel !== null
                    && $unitFloor === mb_strtolower($floorLabel)
                    && $unitRoom === mb_strtolower((string) $room->label);
            });

            $total = $matching->count();
            $done = $matching->filter(fn (FieldInstallationUnit $u) => in_array(
                $u->status instanceof FieldUnitStatus ? $u->status->value : (string) $u->status,
                [FieldUnitStatus::Installed->value, FieldUnitStatus::Waived->value],
                true
            ))->count();

            $room->openings_total = $total;
            $room->openings_done = $done;
            $room->completion_percent = $total > 0 ? (int) round(($done / $total) * 100) : 0;
            $room->save();
        }

        foreach ($scopes->where('type', ProjectScopeType::Floor) as $floor) {
            $children = $scopes->where('parent_id', $floor->id);
            if ($children->isNotEmpty()) {
                $total = (int) $children->sum('openings_total');
                $done = (int) $children->sum('openings_done');
            } else {
                $matching = $units->filter(function (FieldInstallationUnit $unit) use ($floor) {
                    return mb_strtolower(trim((string) $unit->unit_floor)) === mb_strtolower($floor->label);
                });
                $total = $matching->count();
                $done = $matching->filter(fn (FieldInstallationUnit $u) => in_array(
                    $u->status instanceof FieldUnitStatus ? $u->status->value : (string) $u->status,
                    [FieldUnitStatus::Installed->value, FieldUnitStatus::Waived->value],
                    true
                ))->count();
            }

            $floor->openings_total = $total;
            $floor->openings_done = $done;
            $floor->completion_percent = $total > 0 ? (int) round(($done / $total) * 100) : 0;
            $floor->save();

            if ($floor->project_floor_id) {
                ProjectFloor::query()->whereKey($floor->project_floor_id)->update([
                    'completion_percent' => $floor->completion_percent,
                ]);
            }
        }

        $waves = ProjectWave::query()->where('project_id', $project->id)->get();
        foreach ($waves as $wave) {
            $waveFloors = $scopes->where('project_wave_id', $wave->id)->where('type', ProjectScopeType::Floor);
            $total = (int) $waveFloors->sum('openings_total');
            $done = (int) $waveFloors->sum('openings_done');
            $wave->completion_percent = $total > 0 ? (int) round(($done / $total) * 100) : 0;
            if ($wave->completion_percent >= 100 && $total > 0) {
                $wave->status = ProjectWaveStatus::Complete;
            }
            $wave->save();
        }
    }

    /**
     * Floor labels belonging to a wave (for cutting / unit filters).
     *
     * @return list<string>
     */
    public function floorLabelsForWave(?ProjectWave $wave): array
    {
        if (! $wave) {
            return [];
        }

        return ProjectScope::query()
            ->where('project_wave_id', $wave->id)
            ->where('type', ProjectScopeType::Floor->value)
            ->pluck('label')
            ->map(fn ($label) => (string) $label)
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function measurementLines(Project $project): array
    {
        $stageData = is_array($project->stage_data) ? $project->stage_data : [];
        $fromStage = $stageData['site_measurement']['form']['lines']
            ?? $stageData['site_measurement']['lines']
            ?? null;

        if (is_array($fromStage) && $fromStage !== []) {
            return $fromStage;
        }

        $visit = SiteVisit::query()
            ->where('project_id', $project->id)
            ->whereNotNull('measurement_form_data')
            ->whereIn('status', [
                SiteVisitStatus::Completed->value,
                SiteVisitStatus::Approved->value,
            ])
            ->latest('id')
            ->first();

        if (! $visit) {
            $visit = SiteVisit::query()
                ->where('project_id', $project->id)
                ->whereNotNull('measurement_form_data')
                ->latest('id')
                ->first();
        }

        $form = is_array($visit?->measurement_form_data) ? $visit->measurement_form_data : [];
        $lines = $form['lines'] ?? [];

        return is_array($lines) ? $lines : [];
    }

    /**
     * @return array{0: ProjectScope, 1: bool}
     */
    protected function findOrCreateFloorScope(
        Project $project,
        ProjectWave $wave,
        string $label,
        int $sortOrder,
    ): array {
        $existing = ProjectScope::query()
            ->where('project_id', $project->id)
            ->where('type', ProjectScopeType::Floor->value)
            ->whereRaw('LOWER(label) = ?', [mb_strtolower($label)])
            ->first();

        if ($existing) {
            if (! $existing->project_wave_id) {
                $existing->project_wave_id = $wave->id;
                $existing->save();
            }

            return [$existing, false];
        }

        $scope = ProjectScope::query()->create([
            'project_id' => $project->id,
            'project_wave_id' => $wave->id,
            'parent_id' => null,
            'type' => ProjectScopeType::Floor,
            'label' => $label,
            'sort_order' => $sortOrder,
            'completion_percent' => 0,
        ]);

        return [$scope, true];
    }

    /**
     * @return array{0: ProjectScope, 1: bool}
     */
    protected function findOrCreateRoomScope(
        Project $project,
        ProjectWave $wave,
        ProjectScope $floorScope,
        string $roomLabel,
        int $sortOrder,
    ): array {
        $existing = ProjectScope::query()
            ->where('project_id', $project->id)
            ->where('type', ProjectScopeType::Room->value)
            ->where('parent_id', $floorScope->id)
            ->whereRaw('LOWER(label) = ?', [mb_strtolower($roomLabel)])
            ->first();

        if ($existing) {
            if (! $existing->project_wave_id) {
                $existing->project_wave_id = $wave->id;
                $existing->save();
            }

            return [$existing, false];
        }

        $scope = ProjectScope::query()->create([
            'project_id' => $project->id,
            'project_wave_id' => $wave->id,
            'parent_id' => $floorScope->id,
            'type' => ProjectScopeType::Room,
            'label' => $roomLabel,
            'room_key' => mb_strtolower($roomLabel),
            'sort_order' => $sortOrder,
            'completion_percent' => 0,
        ]);

        return [$scope, true];
    }

    protected function ensureProjectFloor(Project $project, string $label, ProjectScope $scope): ProjectFloor
    {
        $floor = ProjectFloor::query()
            ->where('project_id', $project->id)
            ->whereRaw('LOWER(floor_label) = ?', [mb_strtolower($label)])
            ->first();

        if ($floor) {
            return $floor;
        }

        $maxSort = (int) ProjectFloor::query()->where('project_id', $project->id)->max('sort_order');

        return ProjectFloor::query()->create([
            'project_id' => $project->id,
            'floor_label' => $label,
            'completion_percent' => 0,
            'sort_order' => $maxSort + 1,
            'project_scope_id' => $scope->id,
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     * @return list<string>
     */
    protected function roomsForFloor(array $lines, string $floorLabel): array
    {
        $rooms = [];
        foreach ($lines as $line) {
            if (! is_array($line)) {
                continue;
            }
            $unitFloor = $this->nullableTrim($line['unit_floor'] ?? null);
            $room = $this->nullableTrim($line['room_location'] ?? null);
            if ($unitFloor === null || $room === null) {
                continue;
            }
            if (mb_strtolower($unitFloor) !== mb_strtolower($floorLabel)) {
                continue;
            }
            $rooms[mb_strtolower($room)] = $room;
        }

        return array_values($rooms);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ProjectScope>  $rooms
     * @return array<string, mixed>
     */
    protected function scopePayload(ProjectScope $floor, $rooms): array
    {
        $childRooms = $rooms->where('parent_id', $floor->id)->values();

        return [
            'id' => $floor->id,
            'type' => $floor->type?->value ?? $floor->type,
            'label' => $floor->label,
            'project_floor_id' => $floor->project_floor_id,
            'completion_percent' => $floor->completion_percent,
            'openings_total' => $floor->openings_total,
            'openings_done' => $floor->openings_done,
            'stage' => $floor->stage,
            'rooms' => $childRooms->map(fn (ProjectScope $room) => [
                'id' => $room->id,
                'label' => $room->label,
                'room_key' => $room->room_key,
                'completion_percent' => $room->completion_percent,
                'openings_total' => $room->openings_total,
                'openings_done' => $room->openings_done,
                'stage' => $room->stage,
            ])->all(),
        ];
    }

    protected function nullableTrim(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
