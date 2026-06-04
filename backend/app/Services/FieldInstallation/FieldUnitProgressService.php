<?php

namespace App\Services\FieldInstallation;

use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\ProjectBomLine;
use Illuminate\Support\Facades\DB;

class FieldUnitProgressService
{
    public function __construct(
        protected FieldInstallationAuditLogger $audit,
    ) {}

    public function generateFromBom(FieldInstallationJob $job): int
    {
        $job->loadMissing('project.latestBom.lines.floor');

        $bom = $job->project?->latestBom;
        if (! $bom) {
            return 0;
        }

        $created = 0;

        DB::transaction(function () use ($job, $bom, &$created): void {
            $sort = 0;
            foreach ($bom->lines as $line) {
                if ($line->is_procurement_only) {
                    continue;
                }

                $label = $this->unitLabel($line);

                FieldInstallationUnit::query()->firstOrCreate(
                    [
                        'job_id' => $job->id,
                        'project_bom_line_id' => $line->id,
                    ],
                    [
                        'project_floor_id' => $line->floor_id,
                        'unit_label' => $label,
                        'status' => FieldUnitStatus::Pending->value,
                        'sort_order' => $sort++,
                    ],
                );

                $created++;
            }

            $this->recalculateJobPercent($job);
        });

        return $created;
    }

    public function updateStatus(
        FieldInstallationUnit $unit,
        FieldUnitStatus $status,
        ?int $installedBy = null,
        ?string $snagNotes = null,
    ): FieldInstallationUnit {
        $updates = ['status' => $status];

        if ($status === FieldUnitStatus::Installed) {
            $updates['installed_at'] = now();
            $updates['installed_by'] = $installedBy;
        }

        if ($snagNotes !== null) {
            $updates['snag_notes'] = $snagNotes;
        }

        $unit->update($updates);

        $this->recalculateJobPercent($unit->job);

        if ($status === FieldUnitStatus::Installed) {
            $this->audit->log('field.unit_installed', $unit, newValues: [
                'status' => $status->value,
                'installed_by' => $installedBy,
            ]);
        }

        return $unit->fresh();
    }

    public function recalculateJobPercent(FieldInstallationJob $job): void
    {
        $total = $job->units()->count();
        if ($total === 0) {
            $job->update(['percent_complete' => 0]);

            return;
        }

        $complete = $job->units()
            ->whereIn('status', [FieldUnitStatus::Installed->value, FieldUnitStatus::Waived->value])
            ->count();

        $percent = round(($complete / $total) * 100, 2);
        $job->update(['percent_complete' => $percent]);
    }

    protected function unitLabel(ProjectBomLine $line): string
    {
        $name = $line->material_name ?: $line->material_code ?: 'Unit';
        $floor = $line->relationLoaded('floor') ? $line->floor?->name : null;

        return $floor ? "{$floor} — {$name}" : $name;
    }
}
