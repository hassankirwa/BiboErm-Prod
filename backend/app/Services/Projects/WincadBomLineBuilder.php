<?php

namespace App\Services\Projects;

use Illuminate\Support\Str;

class WincadBomLineBuilder
{
    public function __construct(
        protected BomExcelExtractionService $bomExcel,
    ) {}

    /**
     * @param  array<string, mixed>  $fabricationPayload
     * @return array{
     *     lines: array<int, array<string, mixed>>,
     *     summary: array<string, mixed>,
     *     source_filename: string|null,
     *     source_type: string,
     *     project: array<string, mixed>|null,
     *     items: array<int, array<string, mixed>>
     * }
     */
    public function build(array $fabricationPayload, ?string $sourceFilename = null): array
    {
        $rawLines = $this->rawLinesFromFabricationPayload($fabricationPayload);
        $payload = $this->bomExcel->buildExtractionPayload($rawLines, $sourceFilename);
        $payload['source_type'] = 'wincad_fabrication';
        $payload['project'] = $fabricationPayload['project'] ?? null;
        $payload['items'] = $fabricationPayload['items'] ?? [];
        $payload['summary']['wincad_items'] = count($fabricationPayload['items'] ?? []);

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    public function rawLinesFromFabricationPayload(array $payload): array
    {
        $lines = [];
        $row = 1;

        foreach (($payload['items'] ?? []) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $series = $this->stringOrNull($item['series'] ?? null);
            $wincadCode = $this->stringOrNull($item['code'] ?? null);
            $itemQty = max(1.0, (float) ($item['quantity'] ?? 1));
            $prefix = trim(implode(' ', array_filter([$wincadCode, $series])));

            foreach (['frame_profiles', 'sash_profiles'] as $bucket) {
                foreach (($item[$bucket] ?? []) as $profile) {
                    if (! is_array($profile)) {
                        continue;
                    }

                    $materialCode = $this->stringOrNull($profile['code_no'] ?? null);
                    $materialName = $this->stringOrNull($profile['name'] ?? null)
                        ?? $materialCode
                        ?? 'Aluminium profile';
                    $qty = $this->positiveFloat($profile['qty'] ?? null) ?? 1.0;
                    $length = $this->positiveInt($profile['length_mm'] ?? null);

                    if ($materialCode === null && $materialName === 'Aluminium profile') {
                        continue;
                    }

                    $lines[] = [
                        'row_number' => ++$row,
                        'source_system' => 'wincad',
                        'series' => $series,
                        'opening_code' => $wincadCode,
                        'line_type' => 'aluminium_profile',
                        'material_code' => $materialCode,
                        'material_name' => $materialName,
                        'quantity' => $qty * $itemQty,
                        'measurement_mm' => $length,
                        'unit_of_measure' => 'metre',
                        'compatible_profile_code' => $materialCode,
                        'notes' => $this->notes([
                            $prefix,
                            $bucket === 'frame_profiles' ? 'Frame profile' : 'Sash profile',
                            $profile['mark'] ?? null,
                            $profile['corner'] ?? null,
                        ]),
                    ];
                }
            }

            foreach (($item['hardware'] ?? []) as $hardware) {
                if (! is_array($hardware)) {
                    continue;
                }

                [$materialCode, $materialName] = $this->resolveHardwareIdentity($hardware);
                if ($materialName === null && $materialCode === null) {
                    continue;
                }

                $unit = $this->stringOrNull($hardware['unit'] ?? null);

                $lines[] = [
                    'row_number' => ++$row,
                    'source_system' => 'wincad',
                    'series' => $series,
                    'opening_code' => $wincadCode,
                    'line_type' => 'accessory',
                    'material_code' => $materialCode,
                    'material_name' => $materialName ?? $materialCode ?? 'Accessory',
                    'quantity' => ($this->positiveFloat($hardware['qty'] ?? null) ?? 1.0) * $itemQty,
                    'measurement_mm' => null,
                    'unit_of_measure' => $unit ?? 'pcs',
                    'notes' => $this->notes([
                        $prefix,
                        $hardware['specification'] ?? null,
                        $unit,
                        $hardware['purpose'] ?? null,
                        $hardware['mark'] ?? null,
                    ]),
                ];
            }

            foreach (($item['glass'] ?? []) as $glass) {
                if (! is_array($glass)) {
                    continue;
                }

                $name = $this->stringOrNull($glass['name'] ?? null) ?? 'Glass';
                $width = $this->positiveInt($glass['width_mm'] ?? null);
                $height = $this->positiveInt($glass['height_mm'] ?? null);

                $lines[] = [
                    'row_number' => ++$row,
                    'source_system' => 'wincad',
                    'series' => $series,
                    'opening_code' => $wincadCode,
                    'line_type' => 'glass',
                    'material_code' => null,
                    'material_name' => $name,
                    'quantity' => ($this->positiveFloat($glass['qty'] ?? null) ?? 1.0) * $itemQty,
                    'measurement_mm' => $height ?? $width,
                    'width_mm' => $width,
                    'height_mm' => $height,
                    'unit_of_measure' => 'pcs',
                    'notes' => $this->notes([
                        $prefix,
                        $glass['specification'] ?? null,
                        $width && $height ? "{$width}x{$height}mm" : null,
                        $glass['mark'] ?? null,
                    ]),
                ];
            }
        }

        return $this->mergeLikeLines($lines);
    }

    /**
     * @param  array<string, mixed>  $hardware
     * @return array{0: string|null, 1: string|null}
     */
    protected function resolveHardwareIdentity(array $hardware): array
    {
        $name = $this->stringOrNull($hardware['name'] ?? null);
        $specification = $this->stringOrNull($hardware['specification'] ?? null);
        $mark = $this->stringOrNull($hardware['mark'] ?? null);

        if ($name !== null && $this->looksLikeCode($name) && $specification !== null) {
            return [$name, $specification];
        }

        return [$mark && $this->looksLikeCode($mark) ? $mark : null, $name ?? $specification];
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @return array<int, array<string, mixed>>
     */
    protected function mergeLikeLines(array $lines): array
    {
        $merged = [];

        foreach ($lines as $line) {
            $key = implode('|', [
                $line['line_type'] ?? '',
                $line['material_code'] ?? '',
                mb_strtolower((string) ($line['material_name'] ?? '')),
                $line['measurement_mm'] ?? '',
                $line['width_mm'] ?? '',
                $line['height_mm'] ?? '',
                $line['unit_of_measure'] ?? '',
                $line['opening_code'] ?? '',
            ]);

            if (! isset($merged[$key])) {
                $merged[$key] = $line;
                continue;
            }

            $merged[$key]['quantity'] = (float) $merged[$key]['quantity'] + (float) $line['quantity'];
        }

        return array_values($merged);
    }

    /**
     * @param  array<int, mixed>  $parts
     */
    protected function notes(array $parts): ?string
    {
        $notes = array_values(array_filter(array_map(
            fn (mixed $part) => $this->stringOrNull(is_scalar($part) ? (string) $part : null),
            $parts,
        )));

        return $notes === [] ? null : implode(' | ', array_unique($notes));
    }

    protected function stringOrNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = Str::squish(trim((string) $value));

        return $value === '' ? null : $value;
    }

    protected function positiveFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $number = (float) $value;

        return $number > 0 ? $number : null;
    }

    protected function positiveInt(mixed $value): ?int
    {
        $number = $this->positiveFloat($value);

        return $number !== null ? (int) round($number) : null;
    }

    protected function looksLikeCode(string $value): bool
    {
        return (bool) preg_match('/^(?:[A-Z]{1,5}[-A-Z0-9]*\\d|\\d{4,}|[A-Z]{1,4}\\d{1,4})$/i', trim($value));
    }
}
