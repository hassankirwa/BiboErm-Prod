<?php

namespace App\Services\Warehouse\MasterData;

use App\Enums\Warehouse\DeckSlug;
use App\Enums\Warehouse\SectionType;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\Warehouse;
use App\Services\Excel\Structure\MaterialClassifier;
use App\Support\BiboStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class BinCatalogExcelService
{
    public const FILE_TO_SECTION = [
        'premium' => 'SEC-ALU-PREMIUM',
        'standard' => 'SEC-ALU-STANDARD',
        'balustrade' => 'SEC-ALU-BALUSTRADE',
        'specialty' => 'SEC-ALU-SPECIALTY',
    ];

    public const SECTION_NAMES = [
        'premium' => 'Premium Window Profiles',
        'standard' => 'Standard Window Profiles',
        'balustrade' => 'Balustrade & Balcony Profiles',
        'specialty' => 'Specialty Aluminium (Tubes/Louvers/Shower/Net)',
    ];

    public function __construct(
        protected WarehouseMaterialCatalogExcelService $richCatalog,
        protected CatalogImageStorage $images,
        protected MaterialClassifier $materialClassifier,
    ) {}

    public function extractFromUpload(
        UploadedFile $file,
        ?string $catalogTier = null,
        ?string $extractToken = null,
    ): array {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        if (! in_array($extension, ['xls', 'xlsx', 'csv'], true)) {
            throw ValidationException::withMessages([
                'file' => ['Upload a bin catalog as .xlsx, .xls, or .csv.'],
            ]);
        }

        $tier = $this->resolveCatalogTier($catalogTier, $file->getClientOriginalName());
        if ($tier === null) {
            throw ValidationException::withMessages([
                'catalog_tier' => ['Could not infer bin tier from filename; pass catalog_tier explicitly.'],
            ]);
        }

        $extractToken = $extractToken !== null && trim($extractToken) !== ''
            ? trim($extractToken)
            : (string) Str::uuid();

        $items = [];
        $rows = [];

        if ($extension === 'csv') {
            $rows = $this->extractFromCsv($file->getRealPath() ?: $file->getPathname(), $tier, $file->getClientOriginalName());
        } elseif ($tier !== 'balustrade') {
            $rich = $this->richCatalog->extractFromUpload($file, $tier, $extractToken);
            $extractToken = (string) ($rich['extract_token'] ?? $extractToken);
            $items = is_array($rich['items'] ?? null) ? $rich['items'] : [];
            $rows = $this->codesFromRichItems($items, $tier, $file->getClientOriginalName());
        }

        if ($rows === []) {
            $rows = $this->extractFromWorkbook(
                $file->getRealPath() ?: $file->getPathname(),
                $tier,
                $file->getClientOriginalName(),
            );
        }

        if ($rows === []) {
            throw ValidationException::withMessages([
                'file' => ['No bin catalog codes were parsed. Expected a Code column, or a Name column for balustrade workbooks.'],
            ]);
        }

        $rows = $this->annotateSyncStatus($rows, $tier);
        $statusCounts = collect($rows)->countBy('_sync_status');

        return [
            'catalog_tier' => $tier,
            'section_code' => self::FILE_TO_SECTION[$tier],
            'source_filename' => $file->getClientOriginalName(),
            'extract_token' => $extractToken,
            'codes' => $rows,
            'items' => $items,
            'summary' => [
                'total_codes' => count($rows),
                'with_images' => count(array_filter($rows, fn (array $row) => ! empty($row['image_url']) || ! empty($row['image_path']))),
                'with_descriptions' => count(array_filter($rows, fn (array $row) => ! empty($row['description']))),
                'new' => (int) ($statusCounts['new'] ?? 0),
                'changed' => (int) ($statusCounts['changed'] ?? 0),
                'unchanged' => (int) ($statusCounts['unchanged'] ?? 0),
                'sample' => array_slice(array_column($rows, 'code'), 0, 10),
            ],
        ];
    }

    /**
     * Promote extract images, store bin mappings, and upsert catalog warehouse items.
     *
     * @param  array<int, array<string, mixed>>  $codes
     * @param  array<int, array<string, mixed>>|null  $items
     * @return array<string, mixed>
     */
    public function importCatalog(
        array $codes,
        string $catalogTier,
        ?string $sourceFile = null,
        ?string $extractToken = null,
        ?array $items = null,
    ): array {
        /** @var array<string, string> $promotedByTempPath */
        $promotedByTempPath = [];

        $codes = $this->promoteRowImages($codes, $catalogTier, $promotedByTempPath);
        $binResult = $this->storeCodes($codes, $catalogTier, $sourceFile);

        $warehouseItems = is_array($items) && $items !== []
            ? $items
            : $this->itemsFromCodes($codes, $catalogTier);

        $warehouseItems = $this->promoteRowImages($warehouseItems, $catalogTier, $promotedByTempPath);

        $itemResult = $this->richCatalog->importExtractedItems(
            $warehouseItems,
            $catalogTier,
            null,
        );

        if ($extractToken !== null && trim($extractToken) !== '') {
            $this->images->cleanupExtractToken($extractToken);
        }

        return array_merge($binResult, [
            'warehouse_items' => $itemResult,
        ]);
    }

    public function discardExtract(?string $extractToken): void
    {
        if ($extractToken === null || trim($extractToken) === '') {
            return;
        }

        $this->images->cleanupExtractToken($extractToken);
    }

    /**
     * Apply catalog_tier (and missing description/image) to warehouse items from stored bin codes.
     * Creates items for codes that do not yet exist.
     *
     * @return array{codes: int, updated: int, created: int, skipped: int, dry_run: bool}
     */
    public function backfillWarehouseItemsFromBinCodes(bool $dryRun = false): array
    {
        $sectionToTier = array_flip(self::FILE_TO_SECTION);
        $rows = [];

        foreach (BinCatalogCode::query()->with('bin.section')->orderBy('id')->cursor() as $code) {
            $sku = trim((string) $code->code);
            if ($sku === '') {
                continue;
            }

            $sectionCode = $code->bin?->section?->code;
            $tier = is_string($sectionCode) ? ($sectionToTier[$sectionCode] ?? null) : null;
            if ($tier === null) {
                continue;
            }

            $name = trim((string) ($code->source_name ?: $sku));
            $description = $code->source_description;
            $sheet = $code->source_sheet;
            $inAccessoryBlock = is_string($sheet) && str_contains(mb_strtoupper($sheet), 'ACCESSORIES');
            $category = $this->materialClassifier->classifyForCatalog(
                null,
                $name,
                $sheet,
                $tier,
                $inAccessoryBlock,
                $description,
                $sku,
                hasProfileTableContext: ! $inAccessoryBlock,
            );

            $rows[] = [
                'sku' => $sku,
                'code' => $sku,
                'name' => $name,
                'description' => $description,
                'catalog_tier' => $tier,
                'category' => $category,
                'unit_of_measure' => $this->materialClassifier->defaultUnit($category),
                'source_sheet' => $sheet,
                'image_path' => $code->image_path,
                'in_accessory_block' => $inAccessoryBlock,
            ];
        }

        if ($dryRun) {
            return [
                'codes' => count($rows),
                'updated' => 0,
                'created' => 0,
                'skipped' => 0,
                'dry_run' => true,
            ];
        }

        $result = $this->richCatalog->storeItems($rows, 'catalog', 'incremental');

        return [
            'codes' => count($rows),
            'updated' => (int) ($result['updated'] ?? 0),
            'created' => (int) ($result['added'] ?? 0),
            'skipped' => (int) ($result['skipped'] ?? 0),
            'dry_run' => false,
        ];
    }

    public function listCatalogBins(?string $catalogTier = null, ?string $search = null): array
    {
        $query = BinCatalogCode::query()
            ->with('bin.section')
            ->when($catalogTier, function ($builder) use ($catalogTier) {
                $section = self::FILE_TO_SECTION[$catalogTier] ?? null;
                if ($section) {
                    $builder->whereHas('bin.section', fn ($q) => $q->where('code', $section));
                }
            })
            ->when($search && trim($search) !== '', function ($builder) use ($search) {
                $term = '%'.trim($search).'%';
                $builder->where(fn ($q) => $q
                    ->where('code', 'like', $term)
                    ->orWhere('normalized_code', 'like', $term)
                    ->orWhere('source_name', 'like', $term)
                    ->orWhere('source_description', 'like', $term));
            })
            ->orderBy('normalized_code');

        return $query->get()->map(function (BinCatalogCode $row) {
            return [
                'id' => $row->id,
                'code' => $row->code,
                'normalized_code' => $row->normalized_code,
                'source_name' => $row->source_name,
                'source_description' => $row->source_description,
                'source_sheet' => $row->source_sheet,
                'image_path' => $row->image_path,
                'image_url' => $this->imageUrl($row->image_path),
                'source_file' => $row->source_file,
                'bin_id' => $row->bin_id,
                'bin_code' => $row->bin?->code,
                'section_code' => $row->bin?->section?->code,
            ];
        })->all();
    }

    public function storeCodes(array $codes, string $catalogTier, ?string $sourceFile = null): array
    {
        $bin = $this->resolveCatalogBin($catalogTier);
        $added = 0;
        $updated = 0;
        $unchanged = 0;
        $imagesAdded = 0;

        foreach ($codes as $row) {
            $code = trim((string) ($row['code'] ?? ''));
            if ($code === '') {
                continue;
            }

            $existing = BinCatalogCode::query()
                ->where('bin_id', $bin->id)
                ->where('normalized_code', $this->normalizeCode($code))
                ->first();
            $incomingImage = $row['image_path'] ?? null;
            $payload = [
                'code' => $code,
                'source_name' => $row['name'] ?? $row['source_name'] ?? null,
                'source_description' => $row['description'] ?? $row['source_description'] ?? null,
                'source_sheet' => $row['sheet'] ?? $row['source_sheet'] ?? null,
                'source_file' => $sourceFile ?? ($row['source_file'] ?? null),
            ];

            if (! $existing) {
                $payload['image_path'] = $incomingImage;
                BinCatalogCode::query()->create(array_merge($payload, [
                    'bin_id' => $bin->id,
                    'normalized_code' => $this->normalizeCode($code),
                ]));
                $added++;
                $imagesAdded += $incomingImage ? 1 : 0;
                continue;
            }

            if (! $existing->image_path && $incomingImage) {
                $payload['image_path'] = $incomingImage;
                $imagesAdded++;
            }

            $existing->fill($payload);
            if ($existing->isDirty()) {
                $existing->save();
                $updated++;
            } else {
                $unchanged++;
            }
        }

        return [
            'stored' => $added + $updated + $unchanged,
            'added' => $added,
            'updated' => $updated,
            'unchanged' => $unchanged,
            'images_added' => $imagesAdded,
            'bin_id' => $bin->id,
            'bin_code' => $bin->code,
            'section_code' => $bin->section?->code,
        ];
    }

    public function exportCodes(): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Bin Catalog Codes');
        $sheet->fromArray(['Code', 'Name', 'Sheet', 'Source File', 'Bin', 'Section'], null, 'A1');

        $row = 2;
        foreach (BinCatalogCode::query()->with('bin.section')->orderBy('normalized_code')->get() as $code) {
            $sheet->fromArray([
                $code->code,
                $code->source_name,
                $code->source_sheet,
                $code->source_file,
                $code->bin?->code,
                $code->bin?->section?->code,
            ], null, 'A'.$row);
            $row++;
        }

        foreach (range('A', 'F') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $path = tempnam(sys_get_temp_dir(), 'warehouse-bin-catalog-').'.xlsx';
        @unlink($path);
        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }

    protected function extractFromWorkbook(string $path, string $tier, string $sourceFilename): array
    {
        $spreadsheet = IOFactory::load($path);
        $codes = [];
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $headerIndex = null;
            $rows = $sheet->toArray(null, true, true, false);
            foreach ($rows as $idx => $row) {
                $normalized = array_map(fn ($v) => mb_strtolower(trim((string) $v)), $row);
                $codeColumn = array_search('code', $normalized, true);
                if ($codeColumn !== false) {
                    $headerIndex = ['row' => $idx, 'code_col' => (int) $codeColumn, 'name_col' => array_search('name', $normalized, true)];
                    break;
                }
            }

            if (! $headerIndex) {
                if ($tier === 'balustrade') {
                    $codes = array_merge(
                        $codes,
                        $this->extractNameOnlyRows($rows, $sheet->getTitle(), $tier, $sourceFilename),
                    );
                }
                continue;
            }

            foreach ($rows as $idx => $row) {
                if ($idx <= $headerIndex['row']) {
                    continue;
                }
                $code = trim((string) ($row[$headerIndex['code_col']] ?? ''));
                if ($code === '' || strcasecmp($code, 'code') === 0) {
                    continue;
                }

                $codes[] = [
                    'code' => $code,
                    'normalized_code' => $this->normalizeCode($code),
                    'name' => $headerIndex['name_col'] !== false ? trim((string) ($row[$headerIndex['name_col']] ?? '')) : null,
                    'sheet' => $sheet->getTitle(),
                    'catalog_tier' => $tier,
                    'source_file' => $sourceFilename,
                ];
            }
        }

        return $this->uniqueCodes($codes);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function codesFromRichItems(array $items, string $tier, string $sourceFilename): array
    {
        $codes = [];

        foreach ($items as $item) {
            $code = trim((string) ($item['code'] ?? $item['source_code'] ?? ''));
            if ($code === '') {
                continue;
            }

            $metadata = is_array($item['catalog_metadata'] ?? null) ? $item['catalog_metadata'] : [];
            $section = $item['profile_family'] ?? $item['source_sheet'] ?? ($metadata['material_group'] ?? null);
            $codes[] = [
                'code' => $code,
                'normalized_code' => $this->normalizeCode($code),
                'name' => $item['name'] ?? null,
                'description' => $item['description']
                    ?? ($metadata['details'] ?? null),
                'sheet' => $this->resolveGroupLabel(
                    $metadata['sheet_name'] ?? null,
                    $section,
                    (bool) ($item['in_accessory_block'] ?? false),
                ),
                'catalog_tier' => $tier,
                'source_file' => $sourceFilename,
                'image_path' => $item['image_path'] ?? null,
                'image_url' => $item['image_url'] ?? null,
            ];
        }

        return $this->preferRichUniqueCodes($codes);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $promotedByTempPath
     * @return array<int, array<string, mixed>>
     */
    protected function promoteRowImages(array $rows, string $catalogTier, array &$promotedByTempPath): array
    {
        foreach ($rows as $index => $row) {
            $imagePath = $row['image_path'] ?? null;
            if (! is_string($imagePath) || $imagePath === '') {
                continue;
            }

            if (isset($promotedByTempPath[$imagePath])) {
                $rows[$index]['image_path'] = $promotedByTempPath[$imagePath];
                continue;
            }

            if (! $this->images->isExtractPath($imagePath)) {
                continue;
            }

            $sku = (string) ($row['sku'] ?? $row['code'] ?? $row['name'] ?? 'catalog-item');
            $stored = $this->images->promoteExtractPath($imagePath, $sku, $catalogTier);
            if ($stored === null) {
                continue;
            }

            $promotedByTempPath[$imagePath] = $stored['path'];
            $rows[$index]['image_path'] = $stored['path'];
            $rows[$index]['image_url'] = $stored['url'];
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $codes
     * @return array<int, array<string, mixed>>
     */
    protected function itemsFromCodes(array $codes, string $catalogTier): array
    {
        $items = [];

        foreach ($codes as $row) {
            $code = trim((string) ($row['code'] ?? ''));
            if ($code === '') {
                continue;
            }

            $name = trim((string) ($row['name'] ?? $row['source_name'] ?? $code));
            $description = $row['description'] ?? $row['source_description'] ?? null;
            $sheet = $row['sheet'] ?? $row['source_sheet'] ?? null;
            $inAccessoryBlock = is_string($sheet) && str_contains(mb_strtoupper((string) $sheet), 'ACCESSORIES');
            $category = $this->materialClassifier->classifyForCatalog(
                $row['category'] ?? null,
                $name,
                is_string($sheet) ? $sheet : null,
                $catalogTier,
                $inAccessoryBlock,
                is_string($description) ? $description : null,
                $code,
                hasProfileTableContext: ! $inAccessoryBlock,
            );

            $items[] = [
                'sku' => $code,
                'code' => $code,
                'name' => $name !== '' ? $name : $code,
                'description' => $description,
                'catalog_tier' => $catalogTier,
                'category' => $category,
                'unit_of_measure' => $this->materialClassifier->defaultUnit($category),
                'source_sheet' => $sheet,
                'image_path' => $row['image_path'] ?? null,
                'image_url' => $row['image_url'] ?? null,
                'in_accessory_block' => $inAccessoryBlock,
            ];
        }

        return $items;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function preferRichUniqueCodes(array $rows): array
    {
        $unique = [];
        foreach ($rows as $row) {
            $key = (string) ($row['normalized_code'] ?? '');
            if ($key === '') {
                continue;
            }

            if (! isset($unique[$key])) {
                $unique[$key] = $row;
                continue;
            }

            if (empty($unique[$key]['image_path']) && ! empty($row['image_path'])) {
                $unique[$key]['image_path'] = $row['image_path'];
                $unique[$key]['image_url'] = $row['image_url'] ?? null;
            }
            if (empty($unique[$key]['description']) && ! empty($row['description'])) {
                $unique[$key]['description'] = $row['description'];
            }
        }

        return array_values($unique);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function annotateSyncStatus(array $rows, string $tier): array
    {
        $sectionCode = self::FILE_TO_SECTION[$tier];
        $existing = BinCatalogCode::query()
            ->whereHas('bin.section', fn ($query) => $query->where('code', $sectionCode))
            ->get()
            ->keyBy('normalized_code');

        return array_map(function (array $row) use ($existing) {
            $stored = $existing->get((string) ($row['normalized_code'] ?? ''));
            if (! $stored) {
                $row['_sync_status'] = 'new';
                $row['_changed_fields'] = [];
                return $row;
            }

            $changedFields = [];
            $comparisons = [
                'name' => [$stored->source_name, $row['name'] ?? null],
                'description' => [$stored->source_description, $row['description'] ?? null],
                'sheet' => [$stored->source_sheet, $row['sheet'] ?? null],
            ];
            foreach ($comparisons as $field => [$current, $incoming]) {
                if (($current ?? null) !== ($incoming ?? null)) {
                    $changedFields[] = $field;
                }
            }
            if (! $stored->image_path && ! empty($row['image_path'])) {
                $changedFields[] = 'image';
            }

            $row['_sync_status'] = $changedFields === [] ? 'unchanged' : 'changed';
            $row['_changed_fields'] = $changedFields;
            if ($stored->image_path) {
                $row['image_path'] = $stored->image_path;
                $row['image_url'] = $this->imageUrl($stored->image_path);
            }

            return $row;
        }, $rows);
    }

    /**
     * BALUSTRADE has names/details but no material-code column. Persist stable
     * row references so the material mapper can compare descriptions by name.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function extractNameOnlyRows(array $rows, string $sheetName, string $tier, string $sourceFilename): array
    {
        $results = [];
        $nameColumn = null;

        foreach ($rows as $index => $row) {
            $normalized = array_map(fn ($value) => mb_strtolower(trim((string) $value)), $row);
            $detectedNameColumn = array_search('name', $normalized, true);
            if ($detectedNameColumn !== false) {
                $nameColumn = (int) $detectedNameColumn;
                continue;
            }

            if ($nameColumn === null) {
                continue;
            }

            $name = trim((string) ($row[$nameColumn] ?? ''));
            if ($name === '' || strcasecmp($name, 'name') === 0) {
                continue;
            }

            $slug = Str::slug($name);
            if ($slug === '') {
                continue;
            }

            $code = sprintf('BALUSTRADE-%s-%s', Str::slug($sheetName), $slug);
            $results[] = [
                'code' => strtoupper($code),
                'normalized_code' => $this->normalizeCode($code),
                'name' => $name,
                'sheet' => $sheetName,
                'catalog_tier' => $tier,
                'source_file' => $sourceFilename,
            ];
        }

        return $this->uniqueCodes($results);
    }

    protected function extractFromCsv(string $path, string $tier, string $sourceFilename): array
    {
        $handle = fopen($path, 'rb');
        if (! is_resource($handle)) {
            return [];
        }
        $codes = [];
        $header = null;
        while (($row = fgetcsv($handle)) !== false) {
            $normalized = array_map(fn ($v) => mb_strtolower(trim((string) $v)), $row);
            if ($header === null) {
                $codeColumn = array_search('code', $normalized, true);
                if ($codeColumn !== false) {
                    $header = ['code_col' => (int) $codeColumn, 'name_col' => array_search('name', $normalized, true)];
                }
                continue;
            }
            $code = trim((string) ($row[$header['code_col']] ?? ''));
            if ($code === '') {
                continue;
            }
            $codes[] = [
                'code' => $code,
                'normalized_code' => $this->normalizeCode($code),
                'name' => $header['name_col'] !== false ? trim((string) ($row[$header['name_col']] ?? '')) : null,
                'sheet' => 'CSV',
                'catalog_tier' => $tier,
                'source_file' => $sourceFilename,
            ];
        }
        fclose($handle);

        return $this->uniqueCodes($codes);
    }

    protected function uniqueCodes(array $rows): array
    {
        $seen = [];
        $unique = [];
        foreach ($rows as $row) {
            $key = (string) ($row['normalized_code'] ?? '');
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $unique[] = $row;
        }

        return $unique;
    }

    protected function resolveCatalogBin(string $catalogTier): Bin
    {
        $sectionCode = self::FILE_TO_SECTION[$catalogTier] ?? null;
        if (! $sectionCode) {
            throw ValidationException::withMessages(['catalog_tier' => ['Unsupported bin catalog tier.']]);
        }

        $warehouse = Warehouse::query()->where('code', 'WH-MAIN')->first()
            ?? Warehouse::query()->where('is_active', true)->first()
            ?? Warehouse::query()->create([
                'code' => 'WH-MAIN',
                'name' => 'BIBO Main Warehouse',
                'is_active' => true,
            ]);
        $deck = Deck::query()->firstOrCreate(
            ['warehouse_id' => $warehouse->id, 'slug' => DeckSlug::Aluminium],
            ['name' => 'Aluminium Profiles', 'sort_order' => 1],
        );
        $section = Section::query()->updateOrCreate(
            ['deck_id' => $deck->id, 'code' => $sectionCode],
            [
                'name' => self::SECTION_NAMES[$catalogTier],
                'section_type' => SectionType::ProfileFamily,
                'sort_order' => array_search($catalogTier, array_keys(self::FILE_TO_SECTION), true) + 3,
                'is_active' => true,
            ],
        );

        return Bin::query()->updateOrCreate(
            ['section_id' => $section->id, 'code' => 'CAGE1'],
            ['name' => 'Cage 1', 'sort_order' => 1, 'is_active' => true],
        );
    }

    protected function resolveCatalogTier(?string $requested, ?string $filename): ?string
    {
        if ($requested !== null && array_key_exists($requested, self::FILE_TO_SECTION)) {
            return $requested;
        }
        $base = mb_strtolower((string) pathinfo((string) $filename, PATHINFO_FILENAME));

        return match (true) {
            str_contains($base, 'premium') => 'premium',
            str_contains($base, 'standard') => 'standard',
            str_contains($base, 'balustrade'), str_contains($base, 'balcony') => 'balustrade',
            str_contains($base, 'aluminium'), str_contains($base, 'louver'), str_contains($base, 'louvers'),
            str_contains($base, 'shower'), str_contains($base, 'tube'), str_contains($base, 'net') => 'specialty',
            default => null,
        };
    }

    protected function normalizeCode(string $code): string
    {
        return Str::upper(preg_replace('/[\s_\-]+/', '', trim($code)) ?? trim($code));
    }

    /**
     * Group extracted codes under their originating workbook sheet
     * (e.g. "85 SERIES", "50 FOLDING DOOR"). A stray in-sheet cell can be
     * mis-detected as a section title and would otherwise overwrite the sheet
     * identity (grouping profiles under "85 width" or "Bottom rail"), which made
     * whole sheets appear "not extracted". The accessories subdivision is kept
     * so hardware still surfaces under "<SHEET> ACCESSORIES".
     */
    protected function resolveGroupLabel(?string $sheetName, ?string $section, bool $inAccessoryBlock): ?string
    {
        $base = $this->preferSheetLabel($sheetName, $section);
        if ($base === null || $base === '') {
            return $base;
        }

        $indicatesAccessories = $inAccessoryBlock
            || ($section !== null && str_contains(mb_strtoupper($section), 'ACCESSORIES'));

        if ($indicatesAccessories && ! str_contains(mb_strtoupper($base), 'ACCESSORIES')) {
            return $base.' ACCESSORIES';
        }

        return $base;
    }

    /**
     * Prefer the real workbook sheet name; only fall back to the detected
     * section when the sheet name is generic (e.g. "Sheet1", "CSV").
     */
    protected function preferSheetLabel(?string $sheetName, ?string $section): ?string
    {
        $sheetName = $sheetName !== null ? Str::squish($sheetName) : null;
        $section = $section !== null ? Str::squish($section) : null;

        $isGenericSheet = $sheetName === null
            || $sheetName === ''
            || preg_match('/^(sheet|worksheet|tab|csv)\s*\d*$/i', $sheetName) === 1;

        if (! $isGenericSheet) {
            return $sheetName;
        }

        return $section !== null && $section !== '' ? $section : $sheetName;
    }

    protected function imageUrl(?string $imagePath): ?string
    {
        if (! $imagePath) {
            return null;
        }

        $normalized = ltrim(str_replace('\\', '/', $imagePath), '/');
        if (str_starts_with($normalized, 'public/')) {
            $normalized = substr($normalized, 7);
        }

        return BiboStorage::publicUrlPrefix().'/'.$normalized;
    }
}
