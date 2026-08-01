<?php

namespace App\Services\Projects;

class QuotationLineEnrichmentService
{
    /**
     * Merge optional fabrication BOM data into accounting quotation lines by W&D code.
     *
     * @param  array<string, mixed>  $accountingPayload
     * @param  array<string, mixed>|null  $fabricationPayload
     * @return array<string, mixed>
     */
    public function enrich(array $accountingPayload, ?array $fabricationPayload = null): array
    {
        if ($fabricationPayload === null || ($fabricationPayload['items'] ?? []) === []) {
            return $accountingPayload;
        }

        $itemsByCode = [];
        foreach ($fabricationPayload['items'] as $item) {
            $code = $item['code'] ?? null;
            if (is_string($code) && trim($code) !== '') {
                $itemsByCode[trim($code)] = $item;
            }
        }

        if ($itemsByCode === []) {
            return $accountingPayload;
        }

        $lines = $accountingPayload['lines'] ?? [];
        foreach ($lines as $index => $line) {
            $code = $line['code'] ?? null;
            if (! is_string($code) || ! isset($itemsByCode[$code])) {
                continue;
            }

            $lines[$index] = $this->mergeLineWithFabrication($line, $itemsByCode[$code]);
        }

        $accountingPayload['lines'] = $lines;

        $fabProject = $fabricationPayload['project'] ?? [];
        if (($accountingPayload['project']['order_no'] ?? null) === null && ($fabProject['order_no'] ?? null) !== null) {
            $accountingPayload['project']['order_no'] = $fabProject['order_no'];
            $accountingPayload['project_number'] = $fabProject['order_no'];
        }

        if (($accountingPayload['project']['name'] ?? null) === null && ($fabProject['name'] ?? null) !== null) {
            $accountingPayload['project']['name'] = $fabProject['name'];
            $accountingPayload['project_name'] = $fabProject['name'];
        }

        $accountingPayload['fabrication'] = [
            'project' => $fabProject,
            'summary' => $fabricationPayload['summary'] ?? null,
        ];

        return $accountingPayload;
    }

    /**
     * @param  array<string, mixed>  $line
     * @param  array<string, mixed>  $fabrication
     * @return array<string, mixed>
     */
    protected function mergeLineWithFabrication(array $line, array $fabrication): array
    {
        $fabDimensions = $fabrication['dimensions'] ?? [];
        $fabDrawing = $fabrication['drawing'] ?? [];
        $accounting = $line['metadata']['accounting'] ?? [];
        $accountingDrawing = $accounting['drawing'] ?? [];

        $width = $line['width_mm'] ?? null;
        $height = $line['height_mm'] ?? null;

        if ($width === null || $width <= 0) {
            $width = $fabDimensions['width_mm'] ?? ($fabDrawing['elevation']['width_mm'] ?? null);
        }

        if ($height === null || $height <= 0) {
            $height = $fabDimensions['height_mm'] ?? ($fabDrawing['elevation']['height_mm'] ?? null);
        }

        $glassType = $line['glass_type'] ?? null;
        if ($glassType === null || trim((string) $glassType) === '') {
            $glassType = $this->glassTypeFromFabrication($fabrication);
        }

        $embeddedMedia = $accountingDrawing['embedded_media'] ?? null;
        if (! $this->hasExtractedMedia($embeddedMedia)) {
            $embeddedMedia = $fabDrawing['embedded_media'] ?? $embeddedMedia;
        }
        if (is_array($embeddedMedia)) {
            $embeddedMedia = app(WorkbookDrawingExtractor::class)->prepareMediaForJson($embeddedMedia);
        }

        $elevationSource = $accountingDrawing['elevation']['source']
            ?? ($width > 0 && ($line['width_mm'] ?? null) > 0 ? 'accounting' : null)
            ?? $fabDrawing['elevation']['source']
            ?? $fabDimensions['source']
            ?? null;

        $accounting['drawing'] = array_filter([
            'elevation' => array_filter([
                'width_mm' => $width > 0 ? round((float) $width, 2) : null,
                'height_mm' => $height > 0 ? round((float) $height, 2) : null,
                'source' => $elevationSource,
            ], fn (mixed $value): bool => $value !== null && $value !== ''),
            'embedded_media' => $embeddedMedia,
        ], fn (mixed $value): bool => $value !== null && $value !== '');

        $metadata = $line['metadata'] ?? [];
        $metadata['accounting'] = $accounting;
        $metadata['fabrication'] = $this->compactFabricationMetadata($fabrication);

        $description = trim(implode(' — ', array_filter([
            $line['series'] ?? null,
            $line['code'] ?? null,
            $glassType,
        ])));

        $merged = array_merge($line, array_filter([
            'width_mm' => $width > 0 ? round((float) $width, 2) : null,
            'height_mm' => $height > 0 ? round((float) $height, 2) : null,
            'glass_type' => $glassType,
            'description' => $description !== '' ? $description : ($line['description'] ?? 'Line item'),
            'metadata' => $metadata,
        ], fn (mixed $value): bool => $value !== null));

        $pictureRef = $embeddedMedia['data_url'] ?? null;
        if (is_string($pictureRef) && str_starts_with($pictureRef, 'data:')) {
            $merged['picture_data_url'] = $pictureRef;
        }

        return $merged;
    }

    /**
     * @param  array<string, mixed>  $fabrication
     */
    protected function glassTypeFromFabrication(array $fabrication): ?string
    {
        $glassItems = $fabrication['glass'] ?? [];
        if ($glassItems === []) {
            return null;
        }

        $first = $glassItems[0];
        $name = trim((string) ($first['name'] ?? ''));
        $spec = trim((string) ($first['specification'] ?? ''));

        if ($name === '' && $spec === '') {
            return null;
        }

        if ($name !== '' && $spec !== '') {
            if (preg_match('/(\d+)\s*mm/i', $spec, $matches)) {
                return trim($name).' '.$matches[1].'mm';
            }

            return trim($name.' ('.$spec.')');
        }

        return $name !== '' ? $name : $spec;
    }

    /**
     * @param  array<string, mixed>  $fabrication
     * @return array<string, mixed>
     */
    protected function compactFabricationMetadata(array $fabrication): array
    {
        return array_filter([
            'code' => $fabrication['code'] ?? null,
            'series' => $fabrication['series'] ?? null,
            'colour' => $fabrication['colour'] ?? null,
            'dimensions' => $fabrication['dimensions'] ?? null,
            'glass' => $fabrication['glass'] ?? null,
            'frame_profiles' => $fabrication['frame_profiles'] ?? null,
            'sash_profiles' => $fabrication['sash_profiles'] ?? null,
            'hardware' => $fabrication['hardware'] ?? null,
            'sash_openings' => $fabrication['sash_openings'] ?? null,
            'drawing' => $fabrication['drawing'] ?? null,
            'project' => $fabrication['project'] ?? null,
        ], fn (mixed $value): bool => $value !== null && $value !== []);
    }

    /**
     * @param  mixed  $media
     */
    protected function hasExtractedMedia(mixed $media): bool
    {
        if (! is_array($media)) {
            return false;
        }

        return ($media['status'] ?? null) === 'extracted'
            && (
                (is_string($media['url'] ?? null) && $media['url'] !== '')
                || (is_string($media['storage_path'] ?? null) && $media['storage_path'] !== '')
                || (is_string($media['data_url'] ?? null) && str_starts_with($media['data_url'], 'data:'))
            );
    }
}
