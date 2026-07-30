<?php

namespace App\Enums\Production;

enum ProductionStage: string
{
    case MaterialPrep = 'material_prep';
    case QcPreCheck = 'qc_pre_check';
    case Cutting = 'cutting';
    case Fabrication = 'fabrication';
    case Sash = 'sash';
    case GlassAssembly = 'glass_assembly';
    case Finishing = 'finishing';
    case QcPostFabrication = 'qc_post_fabrication';

    public function label(): string
    {
        return match ($this) {
            self::MaterialPrep => 'Material Preparation',
            self::QcPreCheck => 'QC Pre-Check (materials)',
            self::Cutting => 'Cutting',
            self::Fabrication => 'Fabrication',
            self::Sash => 'Sash Fabrication',
            self::GlassAssembly => 'Glass Assembly',
            self::Finishing => 'Final Assembly & Finishing',
            self::QcPostFabrication => 'QC Post-Fabrication',
        };
    }

    public function sortOrder(): int
    {
        return match ($this) {
            self::MaterialPrep => 1,
            self::QcPreCheck => 2,
            self::Cutting => 3,
            self::Fabrication => 4,
            self::Sash => 5,
            self::GlassAssembly => 6,
            self::Finishing => 7,
            self::QcPostFabrication => 8,
        };
    }

    public function next(): ?self
    {
        $stages = self::ordered();

        $index = array_search($this, $stages, true);

        if ($index === false || $index >= count($stages) - 1) {
            return null;
        }

        return $stages[$index + 1];
    }

    /**
     * @return list<self>
     */
    public static function ordered(): array
    {
        return [
            self::MaterialPrep,
            self::QcPreCheck,
            self::Cutting,
            self::Fabrication,
            self::Sash,
            self::GlassAssembly,
            self::Finishing,
            self::QcPostFabrication,
        ];
    }

    /**
     * Maps to WH StageMaterialReleaseService stage for partial reservation release.
     */
    public function warehouseReleaseStage(): ?self
    {
        return match ($this) {
            self::Cutting => self::Cutting,
            self::Fabrication, self::Sash => self::Fabrication,
            self::GlassAssembly, self::Finishing => self::GlassAssembly,
            default => null,
        };
    }

    public function emitsProjectStageSync(): bool
    {
        return match ($this) {
            self::Cutting,
            self::Fabrication,
            self::Sash,
            self::GlassAssembly,
            self::QcPostFabrication => true,
            default => false,
        };
    }

    /**
     * Stages that dispatch ProductionStageCompleted (PM sync, PROC, QC listeners).
     */
    public function emitsProductionStageCompleted(): bool
    {
        return $this->emitsProjectStageSync()
            || $this === self::QcPreCheck
            || $this === self::Finishing;
    }
}
