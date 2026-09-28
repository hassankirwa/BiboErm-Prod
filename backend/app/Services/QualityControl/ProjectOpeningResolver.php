<?php

namespace App\Services\QualityControl;

use App\Models\ProjectBomLine;
use App\Models\ProjectDocument;
use Illuminate\Support\Collection;

/**
 * Resolve fabrication openings (W&D codes like SD-4) for a project.
 *
 * @phpstan-type OpeningRow array{code: string, project_document_id: int|null}
 */
class ProjectOpeningResolver
{
    /**
     * Prefer design documents with metadata.code; fall back to distinct BOM opening codes.
     * Empty collection means the caller should create one opening-less inspection.
     *
     * @return Collection<int, OpeningRow>
     */
    public function resolve(int $projectId): Collection
    {
        $fromDesigns = $this->fromDesignDocuments($projectId);
        if ($fromDesigns->isNotEmpty()) {
            return $fromDesigns;
        }

        return $this->fromBomLines($projectId);
    }

    /**
     * @return Collection<int, OpeningRow>
     */
    protected function fromDesignDocuments(int $projectId): Collection
    {
        $docs = ProjectDocument::query()
            ->where('project_id', $projectId)
            ->where('type', 'design')
            ->orderBy('id')
            ->get();

        $seen = [];
        $rows = [];

        foreach ($docs as $doc) {
            $code = $this->normalizeCode($doc->metadata['code'] ?? null);
            if ($code === null || isset($seen[$code])) {
                continue;
            }

            $seen[$code] = true;
            $rows[] = [
                'code' => $code,
                'project_document_id' => $doc->id,
            ];
        }

        return collect($rows);
    }

    /**
     * @return Collection<int, OpeningRow>
     */
    protected function fromBomLines(int $projectId): Collection
    {
        $codes = ProjectBomLine::query()
            ->where('project_id', $projectId)
            ->whereNotNull('opening_code')
            ->where('opening_code', '!=', '')
            ->orderBy('opening_code')
            ->distinct()
            ->pluck('opening_code');

        $seen = [];
        $rows = [];

        foreach ($codes as $raw) {
            $code = $this->normalizeCode($raw);
            if ($code === null || isset($seen[$code])) {
                continue;
            }

            $seen[$code] = true;
            $rows[] = [
                'code' => $code,
                'project_document_id' => null,
            ];
        }

        return collect($rows);
    }

    protected function normalizeCode(mixed $raw): ?string
    {
        if (! is_string($raw) && ! is_numeric($raw)) {
            return null;
        }

        $code = strtoupper(trim((string) $raw));

        return $code !== '' ? $code : null;
    }
}
