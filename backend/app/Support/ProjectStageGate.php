<?php

namespace App\Support;

use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectDocument;

class ProjectStageGate
{
    /** @var list<string> */
    public const DESIGN_DOCUMENT_TYPES = [
        'design',
        'design_pdf',
        'design_dwg',
    ];

    public static function hasDesignDocument(Project $project): bool
    {
        if (array_key_exists('design_documents_count', $project->getAttributes())) {
            return (int) $project->getAttribute('design_documents_count') > 0;
        }

        if ($project->relationLoaded('documents')) {
            return $project->documents->contains(
                fn (ProjectDocument $document) => in_array($document->type, self::DESIGN_DOCUMENT_TYPES, true)
            );
        }

        return ProjectDocument::query()
            ->where('project_id', $project->id)
            ->whereIn('type', self::DESIGN_DOCUMENT_TYPES)
            ->exists();
    }

    public static function latestBom(Project $project): ?ProjectBom
    {
        if ($project->relationLoaded('latestBom')) {
            return $project->latestBom;
        }

        return ProjectBom::query()
            ->where('project_id', $project->id)
            ->orderByDesc('version')
            ->first();
    }

    public static function hasBomUploaded(Project $project): bool
    {
        $bom = self::latestBom($project);

        if (! $bom) {
            return false;
        }

        if (array_key_exists('lines_count', $bom->getAttributes())) {
            return (int) $bom->getAttribute('lines_count') > 0;
        }

        if ($bom->relationLoaded('lines')) {
            return $bom->lines->isNotEmpty();
        }

        return $bom->lines()->exists();
    }

    public static function hasBomFinalized(Project $project): bool
    {
        $bom = self::latestBom($project);

        return $bom !== null
            && $bom->status === 'finalized'
            && self::hasBomUploaded($project);
    }

    /**
     * @return array{has_design_document: bool, has_bom_uploaded: bool, has_bom_finalized: bool}
     */
    public static function readiness(Project $project): array
    {
        return [
            'has_design_document' => self::hasDesignDocument($project),
            'has_bom_uploaded' => self::hasBomUploaded($project),
            'has_bom_finalized' => self::hasBomFinalized($project),
        ];
    }
}
