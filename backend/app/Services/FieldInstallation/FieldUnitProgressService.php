<?php

namespace App\Services\FieldInstallation;

use App\Enums\Crm\MeasurementContext;
use App\Enums\Crm\SiteVisitStatus;
use App\Enums\FieldInstallation\FieldPhotoAttachableType;
use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationPhoto;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\Project;
use App\Models\ProjectFloor;
use App\Models\SiteVisit;
use App\Support\SiteMeasurementFormData;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldUnitProgressService
{
    public function __construct(
        protected FieldInstallationAuditLogger $audit,
    ) {}

    public function ensureMeasurementUnits(FieldInstallationJob $job): int
    {
        return $this->generateFromMeasurements($job);
    }

    public function generateFromMeasurements(FieldInstallationJob $job): int
    {
        $job->loadMissing('project.floors');

        $lines = $this->resolveMeasurementLines($job->project);
        $created = 0;

        DB::transaction(function () use ($job, $lines, &$created): void {
            FieldInstallationUnit::query()
                ->where('job_id', $job->id)
                ->whereNull('measurement_line_key')
                ->delete();

            $floorMap = $this->floorMapByLabel($job->project);
            $sort = 0;

            foreach ($lines as $index => $line) {
                if (! is_array($line) || ! SiteMeasurementFormData::lineHasMeasurableData($line)) {
                    continue;
                }

                $ref = $this->nullableTrim($line['ref'] ?? null);
                $productType = $this->nullableTrim($line['product_type'] ?? null);
                $unitFloor = $this->nullableTrim($line['unit_floor'] ?? null);
                $roomLocation = $this->nullableTrim($line['room_location'] ?? null);
                $quantity = max(1, (int) ($line['quantity'] ?? 1));
                $sortOrder = (int) ($line['sort_order'] ?? $index);
                $lineKey = $this->measurementLineKey($sortOrder, $ref, $index);

                $snapshot = [
                    'ref' => $ref,
                    'product_type' => $productType,
                    'unit_floor' => $unitFloor,
                    'room_location' => $roomLocation,
                    'width_centre_mm' => $line['width_centre_mm'] ?? null,
                    'height_centre_mm' => $line['height_centre_mm'] ?? null,
                    'quantity' => $quantity,
                    'remarks' => $this->nullableTrim($line['remarks'] ?? null),
                ];

                $unit = FieldInstallationUnit::query()->firstOrCreate(
                    [
                        'job_id' => $job->id,
                        'measurement_line_key' => $lineKey,
                    ],
                    [
                        'project_floor_id' => $unitFloor !== null
                            ? ($floorMap[mb_strtolower($unitFloor)] ?? null)
                            : null,
                        'unit_label' => $this->measurementUnitLabel($unitFloor, $ref, $productType, $roomLocation),
                        'opening_ref' => $ref,
                        'product_type' => $productType,
                        'unit_floor' => $unitFloor,
                        'room_location' => $roomLocation,
                        'quantity' => $quantity,
                        'measurement_snapshot' => $snapshot,
                        'status' => FieldUnitStatus::Pending->value,
                        'sort_order' => $sort,
                    ],
                );

                if (! $unit->wasRecentlyCreated) {
                    $unit->update([
                        'project_floor_id' => $unitFloor !== null
                            ? ($floorMap[mb_strtolower($unitFloor)] ?? $unit->project_floor_id)
                            : $unit->project_floor_id,
                        'unit_label' => $this->measurementUnitLabel($unitFloor, $ref, $productType, $roomLocation),
                        'opening_ref' => $ref,
                        'product_type' => $productType,
                        'unit_floor' => $unitFloor,
                        'room_location' => $roomLocation,
                        'quantity' => $quantity,
                        'measurement_snapshot' => $snapshot,
                        'sort_order' => $sort,
                    ]);
                }

                $created++;
                $sort++;
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
        ?string $misfitNotes = null,
    ): FieldInstallationUnit {
        if ($status === FieldUnitStatus::Installed) {
            $hasPhoto = FieldInstallationPhoto::query()
                ->where('attachable_type', FieldPhotoAttachableType::UnitProgress->value)
                ->where('attachable_id', $unit->id)
                ->exists();

            if (! $hasPhoto) {
                throw ValidationException::withMessages([
                    'status' => ['Upload at least one photo before marking a unit as installed.'],
                ]);
            }
        }

        if ($status === FieldUnitStatus::Snagged) {
            $snag = trim((string) ($snagNotes ?? $unit->snag_notes ?? ''));
            $misfit = trim((string) ($misfitNotes ?? $unit->misfit_notes ?? ''));

            if ($snag === '' && $misfit === '') {
                throw ValidationException::withMessages([
                    'snag_notes' => ['Snag notes or misfit notes are required when marking a unit as snagged.'],
                ]);
            }
        }

        $updates = ['status' => $status];

        if ($status === FieldUnitStatus::Installed) {
            $updates['installed_at'] = now();
            $updates['installed_by'] = $installedBy;
        }

        if ($snagNotes !== null) {
            $updates['snag_notes'] = $snagNotes;
        }

        if ($misfitNotes !== null) {
            $updates['misfit_notes'] = $misfitNotes;
        }

        $unit->update($updates);

        $this->recalculateJobPercent($unit->job);

        if ($status === FieldUnitStatus::Installed) {
            $this->audit->log('field.unit_installed', $unit, newValues: [
                'status' => $status->value,
                'installed_by' => $installedBy,
            ]);
        }

        return $unit->fresh(['photos']);
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

    /**
     * @return list<array<string, mixed>>
     */
    protected function resolveMeasurementLines(?Project $project): array
    {
        if (! $project) {
            return [];
        }

        $stageData = is_array($project->stage_data) ? $project->stage_data : [];
        $siteMeasurement = $stageData['site_measurement'] ?? null;

        if (is_array($siteMeasurement) && isset($siteMeasurement['lines']) && is_array($siteMeasurement['lines'])) {
            return array_values($siteMeasurement['lines']);
        }

        $visit = SiteVisit::query()
            ->where('project_id', $project->id)
            ->where('measurement_context', MeasurementContext::Production->value)
            ->where('status', SiteVisitStatus::Approved->value)
            ->whereNotNull('measurement_form_data')
            ->latest('approved_at')
            ->latest('id')
            ->first();

        $formData = is_array($visit?->measurement_form_data) ? $visit->measurement_form_data : [];
        $lines = $formData['lines'] ?? [];

        return is_array($lines) ? array_values($lines) : [];
    }

    /**
     * @return array<string, int>
     */
    protected function floorMapByLabel(?Project $project): array
    {
        if (! $project) {
            return [];
        }

        $map = [];
        foreach ($project->floors ?? [] as $floor) {
            /** @var ProjectFloor $floor */
            $label = $this->nullableTrim($floor->floor_label ?? null);
            if ($label !== null) {
                $map[mb_strtolower($label)] = $floor->id;
            }
        }

        return $map;
    }

    protected function measurementLineKey(int $sortOrder, ?string $ref, int $index): string
    {
        $refPart = $ref !== null ? $ref : (string) $index;

        return 'line-'.$sortOrder.'-'.$refPart;
    }

    protected function measurementUnitLabel(
        ?string $unitFloor,
        ?string $ref,
        ?string $productType,
        ?string $roomLocation,
    ): string {
        $detail = trim(implode(' ', array_filter(
            [$ref, $productType],
            fn ($value) => $value !== null && $value !== '',
        )));

        if ($roomLocation !== null) {
            $detail = trim($detail.' ('.$roomLocation.')');
        }

        if ($unitFloor !== null && $detail !== '') {
            return "{$unitFloor} — {$detail}";
        }

        return $unitFloor ?? ($detail !== '' ? $detail : 'Opening');
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
