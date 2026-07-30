<?php

namespace App\Support;

use App\Enums\ProjectStage;

class ProjectStageLabels
{
    /**
     * @return array<string, string>
     */
    public static function all(): array
    {
        return config('bibo.pm.stage_labels', []);
    }

    public static function for(ProjectStage|string $stage): string
    {
        $value = $stage instanceof ProjectStage ? $stage->value : $stage;

        return self::all()[$value] ?? ucwords(str_replace('_', ' ', $value));
    }

    /**
     * Contextual label when stage alone is ambiguous (e.g. materials_reserved before reservation).
     *
     * @param  array<string, mixed>|null  $materialSummary
     */
    public static function contextual(ProjectStage|string $stage, ?array $materialSummary = null): string
    {
        $value = $stage instanceof ProjectStage ? $stage->value : $stage;

        if ($value === ProjectStage::MaterialsReserved->value) {
            $unitsTotal = (int) ($materialSummary['reservation_units_total']
                ?? $materialSummary['warehouse_lines']
                ?? 0);
            $unitsReserved = (int) ($materialSummary['reservation_units_reserved']
                ?? $materialSummary['fully_reserved']
                ?? 0);

            if ($unitsTotal > 0 && $unitsReserved < $unitsTotal) {
                return 'Awaiting materials reservation';
            }
        }

        return self::for($value);
    }

    /**
     * @return list<string>
     */
    public static function autoStages(): array
    {
        return config('bibo.pm.auto_stages', []);
    }

    public static function isAutoStage(ProjectStage|string $stage): bool
    {
        $value = $stage instanceof ProjectStage ? $stage->value : $stage;

        return in_array($value, self::autoStages(), true);
    }

    public static function waitingMessage(ProjectStage|string $stage): ?string
    {
        $value = $stage instanceof ProjectStage ? $stage->value : $stage;

        return config("bibo.pm.stage_waiting_messages.{$value}");
    }

    /**
     * Labels for the /projects/design queue (post-deposit production design work).
     */
    public static function designQueue(ProjectStage|string $stage): string
    {
        $value = $stage instanceof ProjectStage ? $stage->value : $stage;

        return match ($value) {
            ProjectStage::DepositReceived->value => 'Awaiting design',
            ProjectStage::SiteAssessment->value => 'Production measurements',
            ProjectStage::FinalDesignApproval->value => 'Design upload',
            default => self::for($value),
        };
    }
}
