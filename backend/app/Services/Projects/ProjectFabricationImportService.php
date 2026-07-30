<?php

namespace App\Services\Projects;

use App\Models\Project;
use App\Models\ProjectDocument;
use App\Models\User;
use App\Services\Media\FileStorageService;
use App\Support\BiboStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectFabricationImportService
{
    public function __construct(
        protected FabricationExcelExtractionService $extraction,
        protected FileStorageService $files,
    ) {}

    /**
     * Extract a fabrication list and upsert openings by code.
     * Existing openings are updated (BOM tags preserved); new codes are added;
     * codes missing from the upload are removed.
     *
     * @return array{
     *     extraction: array<string, mixed>,
     *     fabrication_document: array<string, mixed>,
     *     design_documents: array<int, array<string, mixed>>,
     *     summary: array{
     *         items: int,
     *         images_saved: int,
     *         designs_saved: int,
     *         created: int,
     *         updated: int,
     *         unchanged: int,
     *         removed: int
     *     }
     * }
     */
    public function import(Project $project, UploadedFile $file, User $user): array
    {
        @set_time_limit(0);

        $extraction = $this->extraction->extractFromUpload($file);

        return DB::transaction(function () use ($project, $file, $user, $extraction) {
            $existingByCode = $this->existingFabricationDesignsByCode($project);
            $fabricationDoc = $this->upsertFabricationWorkbook(
                $project,
                $file,
                $user,
                $extraction
            );

            $designDocuments = [];
            $imagesSaved = 0;
            $created = 0;
            $updated = 0;
            $unchanged = 0;
            $seenCodes = [];

            foreach ($extraction['items'] ?? [] as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }

                $code = trim((string) ($item['code'] ?? ('ITEM-'.($index + 1))));
                if ($code === '') {
                    $code = 'ITEM-'.($index + 1);
                }

                $codeKey = $this->normalizeCode($code);
                $seenCodes[$codeKey] = true;

                $description = $this->buildDescription($item);
                $existing = $existingByCode->get($codeKey);
                $incomingHasImage = $this->itemHasElevationImage($item);

                $draftMetadata = $this->buildOpeningMetadata(
                    $item,
                    $fabricationDoc->id,
                    $code,
                    $description,
                    $incomingHasImage,
                    is_array($existing?->metadata) ? ($existing->metadata['bom_tags'] ?? null) : null,
                );

                if ($existing instanceof ProjectDocument) {
                    $contentChanged = $this->openingContentChanged($existing, $draftMetadata);
                    $existingHasImage = (bool) ($existing->metadata['has_elevation_image'] ?? false);
                    $shouldRefreshMedia = $contentChanged
                        || ($incomingHasImage && ! $existingHasImage)
                        || (! $incomingHasImage && $existingHasImage);

                    if (! $shouldRefreshMedia) {
                        $existing->update([
                            'metadata' => $draftMetadata,
                            'uploaded_by' => $user->id,
                        ]);
                        $unchanged++;
                        $designDocuments[] = $this->serializeDocument($existing->fresh());
                        continue;
                    }

                    $media = $this->resolveOpeningMedia($item, $project->id, $code, $description);
                    if ($media['has_image']) {
                        $imagesSaved++;
                    }

                    $metadata = $this->buildOpeningMetadata(
                        $item,
                        $fabricationDoc->id,
                        $code,
                        $description,
                        $media['has_image'],
                        is_array($existing->metadata) ? ($existing->metadata['bom_tags'] ?? null) : null,
                    );

                    if ($existing->path !== $media['path']) {
                        $this->files->delete($existing->path);
                    }

                    $existing->fill([
                        'filename' => $media['filename'],
                        'path' => $media['path'],
                        'uploaded_by' => $user->id,
                        'metadata' => $metadata,
                        'version' => ((int) $existing->version) + 1,
                    ]);
                    $existing->save();
                    $updated++;
                    $designDocuments[] = $this->serializeDocument($existing->fresh());
                    continue;
                }

                $media = $this->resolveOpeningMedia($item, $project->id, $code, $description);
                if ($media['has_image']) {
                    $imagesSaved++;
                }

                $designDoc = ProjectDocument::query()->create([
                    'project_id' => $project->id,
                    'type' => 'design',
                    'filename' => $media['filename'],
                    'path' => $media['path'],
                    'version' => $this->nextVersion($project->id, 'design'),
                    'uploaded_by' => $user->id,
                    'metadata' => $this->buildOpeningMetadata(
                        $item,
                        $fabricationDoc->id,
                        $code,
                        $description,
                        $media['has_image'],
                        null,
                    ),
                ]);

                $created++;
                $designDocuments[] = $this->serializeDocument($designDoc);
            }

            $removed = $this->removeMissingOpenings($existingByCode, $seenCodes);

            return [
                'extraction' => [
                    'project' => $extraction['project'] ?? null,
                    'summary' => $extraction['summary'] ?? null,
                    'items' => $this->itemsWithoutBinary($extraction['items'] ?? []),
                ],
                'fabrication_document' => $this->serializeDocument($fabricationDoc->fresh()),
                'design_documents' => $designDocuments,
                'summary' => [
                    'items' => count($designDocuments),
                    'images_saved' => $imagesSaved,
                    'designs_saved' => count($designDocuments),
                    'created' => $created,
                    'updated' => $updated,
                    'unchanged' => $unchanged,
                    'removed' => $removed,
                ],
            ];
        });
    }

    /**
     * @return \Illuminate\Support\Collection<string, ProjectDocument>
     */
    protected function existingFabricationDesignsByCode(Project $project)
    {
        return ProjectDocument::query()
            ->where('project_id', $project->id)
            ->where('type', 'design')
            ->where('metadata->source', 'fabrication')
            ->get()
            ->keyBy(fn (ProjectDocument $doc) => $this->normalizeCode((string) ($doc->metadata['code'] ?? '')));
    }

    /**
     * @param  array<string, mixed>  $extraction
     */
    protected function upsertFabricationWorkbook(
        Project $project,
        UploadedFile $file,
        User $user,
        array $extraction,
    ): ProjectDocument {
        $storedWorkbook = $this->files->store(
            $file,
            'project-documents',
            'project-'.$project->id
        );

        $metadata = [
            'source' => 'fabrication_list',
            'project' => $extraction['project'] ?? null,
            'summary' => $extraction['summary'] ?? null,
            'items' => $this->itemsWithoutBinary($extraction['items'] ?? []),
        ];

        $existing = ProjectDocument::query()
            ->where('project_id', $project->id)
            ->where('type', 'fabrication')
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            $this->files->delete($existing->path);
            $existing->update([
                'filename' => $file->getClientOriginalName(),
                'path' => $storedWorkbook['path'],
                'version' => ((int) $existing->version) + 1,
                'uploaded_by' => $user->id,
                'metadata' => $metadata,
            ]);

            // Clean up any stale extra fabrication workbooks.
            ProjectDocument::query()
                ->where('project_id', $project->id)
                ->where('type', 'fabrication')
                ->where('id', '!=', $existing->id)
                ->get()
                ->each(function (ProjectDocument $doc) {
                    $this->files->delete($doc->path);
                    $doc->delete();
                });

            return $existing->fresh();
        }

        return ProjectDocument::query()->create([
            'project_id' => $project->id,
            'type' => 'fabrication',
            'filename' => $file->getClientOriginalName(),
            'path' => $storedWorkbook['path'],
            'version' => $this->nextVersion($project->id, 'fabrication'),
            'uploaded_by' => $user->id,
            'metadata' => $metadata,
        ]);
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array{path: string, filename: string, has_image: bool}
     */
    protected function resolveOpeningMedia(
        array $item,
        int $projectId,
        string $code,
        string $description,
    ): array {
        $dataUrl = $item['drawing']['embedded_media']['data_url'] ?? null;

        if (is_string($dataUrl) && str_starts_with($dataUrl, 'data:')) {
            $storedImage = $this->storeDataUrl(
                $dataUrl,
                'project-documents',
                'project-'.$projectId,
                $code
            );
            if ($storedImage !== null) {
                return [
                    'path' => $storedImage['path'],
                    'filename' => $storedImage['filename'],
                    'has_image' => true,
                ];
            }
        }

        $sidecar = $this->storeJsonSidecar([
            'code' => $code,
            'description' => $description,
            'series' => $item['series'] ?? null,
            'dimensions' => $item['dimensions'] ?? null,
        ], $projectId, $code);

        return [
            'path' => $sidecar['path'],
            'filename' => $sidecar['filename'],
            'has_image' => false,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>|null  $bomTags
     * @return array<string, mixed>
     */
    protected function buildOpeningMetadata(
        array $item,
        int $fabricationDocumentId,
        string $code,
        string $description,
        bool $hasImage,
        ?array $bomTags,
    ): array {
        $metadata = [
            'source' => 'fabrication',
            'fabrication_document_id' => $fabricationDocumentId,
            'code' => $code,
            'series' => $item['series'] ?? null,
            'quantity' => $item['quantity'] ?? null,
            'colour' => $item['colour'] ?? null,
            'dimensions' => $item['dimensions'] ?? null,
            'description' => $description,
            'frame_profiles' => $item['frame_profiles'] ?? [],
            'sash_profiles' => $item['sash_profiles'] ?? [],
            'hardware' => $item['hardware'] ?? [],
            'glass' => $item['glass'] ?? [],
            'sash_openings' => $item['sash_openings'] ?? [],
            'packaging' => $item['packaging'] ?? null,
            'has_elevation_image' => $hasImage,
        ];

        if (is_array($bomTags) && $bomTags !== []) {
            $metadata['bom_tags'] = $bomTags;
        }

        return $metadata;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    protected function itemHasElevationImage(array $item): bool
    {
        $dataUrl = $item['drawing']['embedded_media']['data_url'] ?? null;

        return is_string($dataUrl) && str_starts_with($dataUrl, 'data:');
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    protected function openingContentChanged(ProjectDocument $existing, array $metadata): bool
    {
        $current = is_array($existing->metadata) ? $existing->metadata : [];

        $compareKeys = [
            'series',
            'quantity',
            'colour',
            'dimensions',
            'description',
            'frame_profiles',
            'sash_profiles',
            'hardware',
            'glass',
            'sash_openings',
            'packaging',
            'has_elevation_image',
        ];

        foreach ($compareKeys as $key) {
            if (($current[$key] ?? null) != ($metadata[$key] ?? null)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  \Illuminate\Support\Collection<string, ProjectDocument>  $existingByCode
     * @param  array<string, true>  $seenCodes
     */
    protected function removeMissingOpenings($existingByCode, array $seenCodes): int
    {
        $removed = 0;

        foreach ($existingByCode as $codeKey => $document) {
            if ($codeKey !== '' && isset($seenCodes[$codeKey])) {
                continue;
            }

            $this->files->delete($document->path);
            $document->delete();
            $removed++;
        }

        return $removed;
    }

    protected function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    protected function nextVersion(int $projectId, string $type): int
    {
        return ((int) ProjectDocument::query()
            ->where('project_id', $projectId)
            ->where('type', $type)
            ->max('version')) + 1;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    protected function buildDescription(array $item): string
    {
        $code = $this->asText($item['code'] ?? null) ?: 'Item';
        $series = $this->asText($item['series'] ?? null);
        $dims = is_array($item['dimensions'] ?? null) ? $item['dimensions'] : [];
        $width = $dims['width_mm'] ?? null;
        $height = $dims['height_mm'] ?? null;
        $qty = is_scalar($item['quantity'] ?? null) ? $item['quantity'] : 1;
        $colour = $this->asText($item['colour'] ?? null);

        $parts = array_filter([
            $series !== '' ? "{$code} · {$series}" : $code,
            ($width !== null || $height !== null)
                ? 'W '.(is_scalar($width) ? $width : '—').' × H '.(is_scalar($height) ? $height : '—').' mm'
                : null,
            'Qty '.$qty,
            $colour !== '' ? 'Colour '.$colour : null,
        ]);

        $frameCount = is_array($item['frame_profiles'] ?? null) ? count($item['frame_profiles']) : 0;
        $sashCount = is_array($item['sash_profiles'] ?? null) ? count($item['sash_profiles']) : 0;
        $hardwareCount = is_array($item['hardware'] ?? null) ? count($item['hardware']) : 0;
        $glassCount = is_array($item['glass'] ?? null) ? count($item['glass']) : 0;

        $materialBits = array_filter([
            $frameCount > 0 ? "{$frameCount} frame profile".($frameCount === 1 ? '' : 's') : null,
            $sashCount > 0 ? "{$sashCount} sash profile".($sashCount === 1 ? '' : 's') : null,
            $hardwareCount > 0 ? "{$hardwareCount} hardware" : null,
            $glassCount > 0 ? "{$glassCount} glass" : null,
        ]);

        if ($materialBits !== []) {
            $parts[] = implode(' · ', $materialBits);
        }

        $packaging = $this->asText($item['packaging'] ?? null);
        if ($packaging !== '') {
            $parts[] = 'Packaging: '.$packaging;
        }

        return implode(' · ', $parts);
    }

    protected function asText(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_scalar($value)) {
            return trim((string) $value);
        }

        if (is_array($value)) {
            $flat = [];
            array_walk_recursive($value, function ($entry) use (&$flat) {
                if (is_scalar($entry) && trim((string) $entry) !== '') {
                    $flat[] = trim((string) $entry);
                }
            });

            return implode(', ', $flat);
        }

        return '';
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function itemsWithoutBinary(array $items): array
    {
        $clean = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $copy = $item;
            if (isset($copy['drawing']['embedded_media']['data_url'])) {
                $copy['drawing']['embedded_media']['data_url'] = null;
                $copy['drawing']['embedded_media']['status'] = ($copy['drawing']['embedded_media']['status'] ?? null) === 'extracted'
                    ? 'extracted_persisted'
                    : ($copy['drawing']['embedded_media']['status'] ?? null);
            }
            $clean[] = $copy;
        }

        return $clean;
    }

    /**
     * @return array{path: string, filename: string, url: string|null}|null
     */
    protected function storeDataUrl(
        string $dataUrl,
        string $category,
        string $ownerSegment,
        string $code,
    ): ?array {
        if (! preg_match('#^data:([^;]+);base64,(.+)$#', $dataUrl, $matches)) {
            return null;
        }

        $mime = strtolower(trim($matches[1]));
        $binary = base64_decode($matches[2], true);
        if (! is_string($binary) || $binary === '') {
            return null;
        }

        $extension = match (true) {
            str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => 'jpg',
            str_contains($mime, 'gif') => 'gif',
            str_contains($mime, 'webp') => 'webp',
            default => 'png',
        };

        $safeCode = Str::slug($code, '-') ?: 'design';
        $filename = 'design-'.$safeCode.'-'.strtolower(str_replace('-', '', (string) Str::ulid())).'.'.$extension;
        $relativePath = 'private/'.$category.'/'.$ownerSegment.'/'.$filename;

        Storage::disk(BiboStorage::diskName())->put($relativePath, $binary);

        return [
            'path' => $relativePath,
            'filename' => $filename,
            'url' => BiboStorage::resolvePrivateApiUrl($relativePath),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{path: string, filename: string}
     */
    protected function storeJsonSidecar(array $payload, int $projectId, string $code): array
    {
        $safeCode = Str::slug($code, '-') ?: 'design';
        $filename = 'design-'.$safeCode.'-'.strtolower(str_replace('-', '', (string) Str::ulid())).'.json';
        $relativePath = 'private/project-documents/project-'.$projectId.'/'.$filename;
        Storage::disk(BiboStorage::diskName())->put(
            $relativePath,
            (string) json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );

        return [
            'path' => $relativePath,
            'filename' => $filename,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializeDocument(ProjectDocument $document): array
    {
        return [
            'id' => $document->id,
            'project_id' => $document->project_id,
            'type' => $document->type,
            'filename' => $document->filename,
            'path' => $document->path,
            'version' => $document->version,
            'metadata' => $document->metadata,
            'url' => BiboStorage::resolvePrivateApiUrl($document->path),
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }
}
