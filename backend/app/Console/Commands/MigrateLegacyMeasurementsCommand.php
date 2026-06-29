<?php

namespace App\Console\Commands;

use App\Enums\Crm\MeasurementContext;
use App\Enums\Crm\MeasurementFormStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Deal;
use App\Models\MeasurementLine;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Support\SiteMeasurementFormData;
use Illuminate\Console\Command;

class MigrateLegacyMeasurementsCommand extends Command
{
    protected $signature = 'measurements:migrate-legacy';

    protected $description = 'Migrate legacy measurement_lines and deal site_assessment data into unified measurement forms';

    public function handle(): int
    {
        $visitCount = 0;
        $projectCount = 0;

        SiteVisit::query()
            ->whereNull('measurement_form_data')
            ->orWhere('measurement_form_data', '[]')
            ->chunkById(50, function ($visits) use (&$visitCount) {
                foreach ($visits as $visit) {
                    $form = $this->migrateVisit($visit);
                    if ($form === null) {
                        continue;
                    }

                    $visit->update([
                        'measurement_form_data' => $form,
                        'measurement_context' => $visit->project_id
                            ? MeasurementContext::Production->value
                            : MeasurementContext::Quotation->value,
                        'measurement_form_status' => $visit->status === SiteVisitStatus::Approved->value
                            ? MeasurementFormStatus::Locked->value
                            : MeasurementFormStatus::Draft->value,
                    ]);
                    $visitCount++;
                }
            });

        Project::query()->chunkById(50, function ($projects) use (&$projectCount) {
            foreach ($projects as $project) {
                $stageData = is_array($project->stage_data) ? $project->stage_data : [];
                if (isset($stageData['site_measurement'])) {
                    continue;
                }

                $legacy = $stageData['site_assessment'] ?? null;
                if (! is_array($legacy)) {
                    continue;
                }

                $form = $this->migrateAssessmentArray($legacy);
                if ($form === null) {
                    continue;
                }

                $stageData['site_measurement'] = array_merge($form, [
                    'migrated_from' => 'site_assessment',
                    'recorded_at' => now()->toIso8601String(),
                ]);
                $project->update(['stage_data' => $stageData]);
                $projectCount++;
            }
        });

        $this->info("Migrated {$visitCount} site visits and {$projectCount} projects.");

        return self::SUCCESS;
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function migrateVisit(SiteVisit $visit): ?array
    {
        if ($visit->deal_id) {
            $deal = Deal::query()->find($visit->deal_id);
            if (is_array($deal?->site_assessment)) {
                $form = $this->migrateAssessmentArray($deal->site_assessment);
                if ($form !== null) {
                    return $form;
                }
            }
        }

        $lines = MeasurementLine::query()
            ->where('site_visit_id', $visit->id)
            ->orderBy('sort_order')
            ->get();

        if ($lines->isEmpty()) {
            return null;
        }

        $formLines = [];
        foreach ($lines as $index => $line) {
            $widthMm = $line->width ? round((float) $line->width * 1000, 2) : null;
            $heightMm = $line->height ? round((float) $line->height * 1000, 2) : null;

            $formLines[] = [
                'ref' => (string) ($index + 1),
                'room_location' => $line->room_area_name,
                'product_type' => $line->material_preference,
                'quantity' => (int) ($line->quantity ?? 1),
                'width_centre_mm' => $widthMm,
                'height_centre_mm' => $heightMm,
                'remarks' => trim(implode("\n", array_filter([
                    $line->installation_notes,
                    $line->obstacles_notes,
                    $line->client_comments,
                ]))),
                'sort_order' => $index,
                'migrated' => true,
            ];
        }

        return SiteMeasurementFormData::normalize([
            'lines' => $formLines,
            'operational_notes' => $visit->field_officer_notes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $assessment
     * @return array<string, mixed>|null
     */
    protected function migrateAssessmentArray(array $assessment): ?array
    {
        $lines = [];
        $order = 0;

        foreach (['doors' => 'Door', 'windows' => 'Window'] as $key => $prefix) {
            foreach ($assessment[$key] ?? [] as $item) {
                $label = trim((string) ($item['label'] ?? ''));
                if ($label === '') {
                    continue;
                }

                $widthFt = $item['width_ft'] ?? null;
                $heightFt = $item['height_ft'] ?? null;

                $lines[] = [
                    'ref' => (string) ($order + 1),
                    'room_location' => $label,
                    'product_type' => $prefix,
                    'quantity' => 1,
                    'width_centre_mm' => is_numeric($widthFt) ? round((float) $widthFt * 304.8, 2) : null,
                    'height_centre_mm' => is_numeric($heightFt) ? round((float) $heightFt * 304.8, 2) : null,
                    'remarks' => $item['notes'] ?? null,
                    'sort_order' => $order++,
                    'migrated' => true,
                ];
            }
        }

        if ($lines === []) {
            return null;
        }

        return SiteMeasurementFormData::normalize([
            'lines' => $lines,
            'operational_notes' => $assessment['operational_notes'] ?? null,
        ]);
    }
}
