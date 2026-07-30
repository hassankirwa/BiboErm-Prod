<?php

namespace App\Services\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\ItemAlias;
use App\Models\Warehouse\Rubber;
use App\Services\Projects\WorkbookDrawingExtractor;
use App\Services\Excel\Structure\DimensionParser;
use App\Services\Excel\Structure\ExcelRowUtils;
use App\Services\Excel\Structure\ImageAnchorResolver;
use App\Services\Excel\Structure\MaterialClassifier;
use App\Services\Excel\Structure\SectionDetector;
use App\Services\Excel\Structure\TableDetector;
use App\Support\BiboStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class WarehouseMaterialCatalogExcelService
{
    public const TIERS = ['premium', 'standard', 'balustrade', 'specialty'];

    public function __construct(
        protected WarehouseItemResolver $resolver,
        protected WorkbookDrawingExtractor $drawings,
        protected CatalogImageStorage $images,
        protected TableDetector $tableDetector,
        protected SectionDetector $sectionDetector,
        protected DimensionParser $dimensionParser,
        protected ImageAnchorResolver $imageAnchorResolver,
        protected MaterialClassifier $materialClassifier,
        protected SkuNormalizer $skuNormalizer,
        protected CatalogWarehouseSyncService $sync,
    ) {}

    /**
     * @return array{
     *     items: array<int, array<string, mixed>>,
     *     summary: array<string, mixed>,
     *     diff: array<string, mixed>,
     *     source_filename: string|null,
     *     catalog_tier: string|null
     * }
     */
    public function extractFromUpload(UploadedFile $file, ?string $catalogTier = null, ?string $extractToken = null): array
    {
        @set_time_limit(0);
        @ini_set('max_execution_time', '0');

        $extension = strtolower((string) $file->getClientOriginalExtension());
        if (! in_array($extension, ['xls', 'xlsx', 'csv'], true)) {
            throw ValidationException::withMessages([
                'file' => ['Upload a material catalog as .xlsx, .xls, or .csv.'],
            ]);
        }

        $path = $file->getRealPath() ?: $file->getPathname();
        $catalogTier = $this->resolveCatalogTier($catalogTier, $file->getClientOriginalName());
        $extractToken = $extractToken !== null && trim($extractToken) !== ''
            ? trim($extractToken)
            : (string) Str::uuid();

        $items = $extension === 'csv'
            ? $this->extractFromCsv($path, $catalogTier)
            : $this->extractFromWorkbook($path, $extension, $catalogTier);

        if ($items === []) {
            throw ValidationException::withMessages([
                'file' => ['No material catalog rows could be parsed from the workbook.'],
            ]);
        }

        $items = $this->attachStoredImages($items, $catalogTier, $extractToken);
        $items = $this->imageAnchorResolver->inheritGroupImages($items, fn (array $item) => $this->groupImageKey($item));

        $diff = $this->sync->compareExtractedWithWarehouse($items, $catalogTier);

        return [
            'items' => $items,
            'summary' => $this->buildSummary($items),
            'diff' => [
                'new' => $diff['new'],
                'changed' => $diff['existing_metadata_changed'],
                'unchanged' => $diff['existing_unchanged'],
                'in_db_only' => $diff['existing_in_db_only'],
                'counts' => $diff['counts'],
            ],
            'source_filename' => $file->getClientOriginalName(),
            'catalog_tier' => $catalogTier,
            'extract_token' => $extractToken,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{
     *     added: int,
     *     updated: int,
     *     unchanged: int,
     *     skipped: int,
     *     stored: int,
     *     totals_recorded_as_reference: int,
     *     images_saved: int
     * }
     */
    public function storeItems(
        array $items,
        string $sourceSystem = 'catalog',
        string $syncMode = 'incremental',
    ): array {
        $result = $this->sync->syncItems($items, $syncMode, $sourceSystem);

        $generalDoorTypeId = DoorType::query()->where('code', 'GEN')->value('id')
            ?? DoorType::query()->value('id');
        $this->seedFabricationHardwareItems($generalDoorTypeId);

        return $result;
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, meta: array{current_page: int, last_page: int, per_page: int, total: int}}
     */
    public function listCatalogItems(
        ?string $catalogTier = null,
        ?string $search = null,
        ?string $category = null,
        int $page = 1,
        int $perPage = 20,
        ?string $stockStatus = null,
    ): array {
        $query = Item::query()
            ->with('aluminiumProfile')
            ->withSum('stockLevels as total_quantity_on_hand', 'quantity_on_hand')
            ->withSum('stockLevels as total_quantity_reserved', 'quantity_reserved')
            ->where('is_active', true)
            ->whereNotNull('catalog_tier')
            ->orderBy('catalog_tier')
            ->orderBy('sku');

        if ($catalogTier !== null && $catalogTier !== '') {
            $query->where('catalog_tier', $catalogTier);
        }

        if ($category !== null && $category !== '') {
            $query->where('category', $category);
        }

        if ($search !== null && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('sku', 'like', $term)
                    ->orWhere('name', 'like', $term)
                    ->orWhere('description', 'like', $term);
            });
        }

        $this->applyStockStatusFilter($query, $stockStatus);

        $perPage = max(1, min(5000, $perPage));
        $paginator = $query->paginate($perPage, ['*'], 'page', max(1, $page));

        return [
            'data' => collect($paginator->items())
                ->map(fn (Item $item) => $this->serializeCatalogItem($item))
                ->values()
                ->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    protected function applyStockStatusFilter($query, ?string $stockStatus): void
    {
        if ($stockStatus === null || $stockStatus === '' || $stockStatus === 'all') {
            return;
        }

        $onHandSql = '(select coalesce(sum(sl.quantity_on_hand), 0) from stock_levels sl where sl.item_id = warehouse_items.id)';
        $reservedSql = '(select coalesce(sum(sl.quantity_reserved), 0) from stock_levels sl where sl.item_id = warehouse_items.id)';
        $availableSql = "({$onHandSql} - {$reservedSql})";

        match ($stockStatus) {
            'zero', 'out_of_stock' => $query->whereRaw("{$onHandSql} <= 0"),
            'reserved' => $query->whereRaw("{$reservedSql} > 0"),
            'low_stock' => $query->whereRaw("{$availableSql} > 0")
                ->whereRaw('warehouse_items.min_stock_qty > 0')
                ->whereRaw("{$availableSql} < warehouse_items.min_stock_qty"),
            'in_stock' => $query->whereRaw("{$availableSql} > 0")
                ->where(function ($builder) use ($availableSql) {
                    $builder->where('warehouse_items.min_stock_qty', '<=', 0)
                        ->orWhereRaw("{$availableSql} >= warehouse_items.min_stock_qty");
                }),
            default => null,
        };
    }

    /**
     * Promote temp extract image paths and persist catalog warehouse items.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<string, mixed>
     */
    public function importExtractedItems(
        array $items,
        string $catalogTier,
        ?string $extractToken = null,
        string $syncMode = 'incremental',
    ): array {
        $promoted = [];

        foreach ($items as $row) {
            $sku = (string) ($row['sku'] ?? $row['code'] ?? $row['name'] ?? 'catalog-item');
            $imagePath = $row['image_path'] ?? null;

            if (is_string($imagePath) && $imagePath !== '' && $this->images->isExtractPath($imagePath)) {
                $stored = $this->images->promoteExtractPath($imagePath, $sku, $catalogTier);
                if ($stored !== null) {
                    $row['image_path'] = $stored['path'];
                    $row['image_url'] = $stored['url'];
                }
            }

            $row['catalog_tier'] = $row['catalog_tier'] ?? $catalogTier;
            $promoted[] = $row;
        }

        $result = $this->storeItems($promoted, 'catalog', $syncMode);

        if ($extractToken !== null && trim($extractToken) !== '') {
            $this->images->cleanupExtractToken($extractToken);
        }

        return $result;
    }

    public function exportWarehouseItems(): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Warehouse Items');
        $sheet->fromArray([
            'SKU',
            'Name',
            'Category',
            'Catalog Tier',
            'Unit',
            'Description',
            'Door Type',
            'Min Stock',
            'Active',
            'Profile Family',
            'Bar Length mm',
            'Weight per metre',
            'Image URL',
        ], null, 'A1');

        $items = Item::query()
            ->with(['doorType', 'aluminiumProfile'])
            ->orderBy('category')
            ->orderBy('sku')
            ->get();

        $row = 2;
        foreach ($items as $item) {
            $sheet->fromArray([
                $item->sku,
                $item->name,
                $item->category?->value ?? $item->category,
                $item->catalog_tier,
                $item->unit_of_measure,
                $item->description,
                $item->doorType?->code,
                (float) $item->min_stock_qty,
                $item->is_active ? 'yes' : 'no',
                $item->aluminiumProfile?->profile_family,
                $item->aluminiumProfile?->standard_bar_length_mm,
                $item->aluminiumProfile?->weight_per_metre,
                $this->resolveImageUrl($item->image_path),
            ], null, 'A'.$row);
            $row++;
        }

        $aliasSheet = $spreadsheet->createSheet();
        $aliasSheet->setTitle('Aliases');
        $aliasSheet->fromArray([
            'Warehouse SKU',
            'Source System',
            'Source Code',
            'Source Name',
            'Series',
            'Line Type',
            'Confidence',
        ], null, 'A1');

        $row = 2;
        foreach (ItemAlias::query()->with('item')->orderBy('source_system')->orderBy('source_name')->get() as $alias) {
            $aliasSheet->fromArray([
                $alias->item?->sku,
                $alias->source_system,
                $alias->source_code,
                $alias->source_name,
                $alias->series,
                $alias->line_type,
                $alias->confidence,
            ], null, 'A'.$row);
            $row++;
        }

        foreach ([$sheet, $aliasSheet] as $worksheet) {
            $worksheet->getStyle('A1:M1')->getFont()->setBold(true);
            foreach (range('A', 'M') as $column) {
                $worksheet->getColumnDimension($column)->setAutoSize(true);
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'warehouse-materials-').'.xlsx';
        @unlink($path);
        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function extractFromWorkbook(string $path, string $extension, ?string $catalogTier): array
    {
        $imagesBySheet = $this->drawings->extractMapsByRowForAllSheets($path, $extension);

        try {
            $reader = IOFactory::createReaderForFile($path);
            // Cell data only — drawings already extracted via ZipArchive/single pass.
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages([
                'file' => ['The workbook could not be read: '.$exception->getMessage()],
            ]);
        }

        $items = [];
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            $rows = $sheet->toArray(null, false, false, false);
            $imagesByRow = $imagesBySheet[$sheetName] ?? [];
            $sheetItems = $this->extractRows($rows, $sheetName, $catalogTier, $imagesByRow);
            $items = array_merge($items, $sheetItems);
        }

        return $items;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function extractFromCsv(string $path, ?string $catalogTier): array
    {
        $rows = [];
        $handle = fopen($path, 'rb');
        if (! is_resource($handle)) {
            return [];
        }

        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);

        return $this->extractRows($rows, 'CSV', $catalogTier, []);
    }

    /**
     * @param  array<int, array<int, mixed>>  $rows
     * @param  array<int, array<string, mixed>>  $imagesByRow
     * @return array<int, array<string, mixed>>
     */
    protected function extractRows(array $rows, string $sheetName, ?string $catalogTier, array $imagesByRow): array
    {
        $items = [];
        $headerMap = [];
        $headerRowIndex = null;
        $currentSection = $this->sectionDetector->resolveInitialSection($rows, $sheetName);
        $inAccessoryBlock = $this->sectionDetector->sectionIndicatesAccessories($currentSection);
        $previousRowWasBlank = false;
        $currentGroupName = null;
        $currentGroupCode = null;
        $groupVariantIndex = 0;
        $usedSkus = [];
        /** @var array<int, array<string, mixed>> $pendingSpecRows */
        $pendingSpecRows = [];

        $flushPending = function (?string $parentName, ?string $parentCode) use (
            &$pendingSpecRows,
            &$items,
            &$groupVariantIndex,
            &$usedSkus,
            $sheetName,
            $catalogTier,
            $imagesByRow,
            &$currentSection,
            &$inAccessoryBlock,
            $headerRowIndex,
        ): void {
            if ($parentName === null || $pendingSpecRows === []) {
                $pendingSpecRows = [];

                return;
            }

            foreach ($pendingSpecRows as $pending) {
                $items[] = $this->buildCatalogItem(
                    cells: $pending['cells'],
                    headerMap: $pending['headerMap'],
                    sheetName: $sheetName,
                    catalogTier: $catalogTier,
                    currentSection: $currentSection,
                    inAccessoryBlock: $inAccessoryBlock,
                    excelRow: $pending['excel_row'],
                    headerRowIndex: $headerRowIndex,
                    imagesByRow: $imagesByRow,
                    name: $parentName,
                    code: $parentCode,
                    description: $pending['description'],
                    no: $pending['no'],
                    length: $pending['length'],
                    total: $pending['total'],
                    isContinuation: true,
                    parentName: $parentName,
                    groupVariantIndex: ++$groupVariantIndex,
                    usedSkus: $usedSkus,
                );
            }

            $pendingSpecRows = [];
        };

        foreach ($rows as $index => $row) {
            $cells = array_map(fn (mixed $cell) => $this->clean(is_scalar($cell) ? (string) $cell : null), $row);

            if (ExcelRowUtils::isBlankRow($cells)) {
                $previousRowWasBlank = true;
                continue;
            }

            if ($this->tableDetector->looksLikeHeader($cells)) {
                $flushPending($currentGroupName, $currentGroupCode);
                $headerMap = $this->tableDetector->headerMap($cells);
                $headerRowIndex = $index;
                $previousRowWasBlank = false;
                continue;
            }

            $sectionTitle = $this->sectionDetector->detectSectionTitle($cells, $headerMap);
            if ($sectionTitle !== null) {
                $flushPending($currentGroupName, $currentGroupCode);
                $currentSection = $sectionTitle;
                $inAccessoryBlock = $this->sectionDetector->sectionIndicatesAccessories($currentSection);
                $headerMap = [];
                $headerRowIndex = null;
                $currentGroupName = null;
                $currentGroupCode = null;
                $groupVariantIndex = 0;
                $previousRowWasBlank = false;
                continue;
            }

            if ($headerMap === []) {
                $previousRowWasBlank = false;
                continue;
            }

            $excelRow = $index + 1;
            $rowValues = $this->tableDetector->rowValues($cells, $headerMap);
            $no = $rowValues['no'];
            $name = $rowValues['name'];
            $code = $rowValues['code'];
            $description = $rowValues['description'];
            $length = $rowValues['length'];
            $total = $rowValues['total'];
            $hasDimensionColumn = $this->tableDetector->tableHasDimensionColumn($headerMap);

            if ($name === null && $code !== null && $this->tableDetector->valueAt($cells, $headerMap, ['code']) !== null && ! isset($headerMap['name'])) {
                $name = $code;
            }

            if (ExcelRowUtils::isCounterOnlyRow($no, $name, $code, $description, $length, $total)) {
                if ($previousRowWasBlank) {
                    $inAccessoryBlock = true;
                    if (! $this->sectionDetector->sectionIndicatesAccessories($currentSection)) {
                        $currentSection = $this->sectionDetector->accessoriesSectionLabel($sheetName);
                    }
                }
                $previousRowWasBlank = false;
                continue;
            }

            if ($previousRowWasBlank && ! $inAccessoryBlock) {
                if ($this->sectionDetector->shouldEnterHardwareBlock($name, $code, $description, $no, $hasDimensionColumn)) {
                    $inAccessoryBlock = true;
                    if (! $this->sectionDetector->sectionIndicatesAccessories($currentSection)) {
                        $currentSection = $this->sectionDetector->accessoriesSectionLabel($sheetName);
                    }
                }
            }
            $previousRowWasBlank = false;

            $specOnly = $description !== null
                && $name === null
                && $code === null
                && ($no === null || ! preg_match('/^\d+$/', (string) $no));

            if ($specOnly) {
                $pendingSpecRows[] = [
                    'cells' => $cells,
                    'headerMap' => $headerMap,
                    'excel_row' => $excelRow,
                    'description' => $description,
                    'no' => $no,
                    'length' => $length,
                    'total' => $total,
                ];
                continue;
            }

            if ($name === null && $description !== null && ! $this->dimensionParser->looksLikeDimensionText($description)) {
                $name = $description;
            }

            if ($name === null && $code === null) {
                continue;
            }

            if ($no !== null && preg_match('/^\d+$/', (string) $no) && $name === null && $description !== null) {
                $pendingSpecRows[] = [
                    'cells' => $cells,
                    'headerMap' => $headerMap,
                    'excel_row' => $excelRow,
                    'description' => $description,
                    'no' => $no,
                    'length' => $length,
                    'total' => $total,
                ];
                continue;
            }

            if ($no === null && $code === null && $name !== null && mb_strlen($name) > 80) {
                continue;
            }

            if ($name !== null && ! $this->dimensionParser->looksLikeDimensionText($name)) {
                if ($currentGroupName !== $name) {
                    $flushPending($name, $code ?? $currentGroupCode);
                    $currentGroupName = $name;
                    $currentGroupCode = $code;
                    $groupVariantIndex = 0;
                } elseif ($code !== null) {
                    $currentGroupCode = $code;
                }
            }

            $isContinuation = $currentGroupName !== null
                && $name !== null
                && $name === $description
                && ! $this->dimensionParser->looksLikeDimensionText($description);

            $items[] = $this->buildCatalogItem(
                cells: $cells,
                headerMap: $headerMap,
                sheetName: $sheetName,
                catalogTier: $catalogTier,
                currentSection: $currentSection,
                inAccessoryBlock: $inAccessoryBlock,
                excelRow: $excelRow,
                headerRowIndex: $headerRowIndex,
                imagesByRow: $imagesByRow,
                name: $name ?? $code,
                code: $code,
                description: $description,
                no: $no,
                length: $length,
                total: $total,
                isContinuation: $isContinuation,
                parentName: $currentGroupName,
                groupVariantIndex: $isContinuation || ($description !== null && ! $this->dimensionParser->looksLikeDimensionText($description))
                    ? ++$groupVariantIndex
                    : max(1, $groupVariantIndex ?: 1),
                usedSkus: $usedSkus,
            );
        }

        $flushPending($currentGroupName, $currentGroupCode);

        return $items;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @param  array<string, int>  $headerMap
     * @param  array<int, array<string, mixed>>  $imagesByRow
     * @param  array<int, string>  $usedSkus
     * @return array<string, mixed>
     */
    protected function buildCatalogItem(
        array $cells,
        array $headerMap,
        string $sheetName,
        ?string $catalogTier,
        string $currentSection,
        bool $inAccessoryBlock,
        int $excelRow,
        ?int $headerRowIndex,
        array $imagesByRow,
        ?string $name,
        ?string $code,
        ?string $description,
        ?string $no,
        ?string $length,
        ?string $total,
        bool $isContinuation,
        ?string $parentName,
        int $groupVariantIndex,
        array &$usedSkus,
    ): array {
        $variant = null;
        if ($description !== null && ! $this->dimensionParser->looksLikeDimensionText($description)) {
            $variant = $description;
        }

        $category = $this->materialClassifier->classifyForCatalog(
            null,
            trim(($name ?? '').' '.($description ?? '')),
            $currentSection,
            $catalogTier,
            $inAccessoryBlock,
            $description,
            $code,
            hasProfileTableContext: ! $inAccessoryBlock && $code !== null,
        );

        $dimensions = $this->dimensionParser->looksLikeDimensionText($description ?? '')
            ? $this->dimensionParser->parseDimensions($description)
            : ['width_mm' => null, 'depth_mm' => null];
        $totalQty = ExcelRowUtils::parseQuantity($total);
        $sku = $this->generateCatalogSku($code, $name, $variant, $groupVariantIndex, $usedSkus);

        $embeddedMedia = $this->imageAnchorResolver->resolve($excelRow, $imagesByRow, $inAccessoryBlock);
        $pictureDataUrl = ($embeddedMedia['status'] ?? null) === 'extracted'
            ? ($embeddedMedia['data_url'] ?? null)
            : null;

        return [
            'sku' => $sku,
            'code' => $code,
            'name' => $name ?? $code ?? $sku,
            'category' => $category,
            'catalog_tier' => $catalogTier,
            'unit_of_measure' => $this->materialClassifier->defaultUnit($category),
            'description' => $this->dimensionParser->looksLikeDimensionText($description ?? '') ? $description : ($variant ?? $description),
            'source_sheet' => $currentSection,
            'source_row' => $excelRow,
            'source_code' => $code ?? $sku,
            'source_name' => $name ?? $description ?? $code,
            'profile_family' => $currentSection,
            'standard_bar_length_mm' => ExcelRowUtils::lengthToMm($length),
            'width_mm' => $dimensions['width_mm'] ?? null,
            'depth_mm' => $dimensions['depth_mm'] ?? null,
            'reference_total_qty' => $totalQty,
            'total_qty' => $totalQty,
            'in_accessory_block' => $inAccessoryBlock,
            'catalog_metadata' => array_filter([
                'sheet_name' => $sheetName,
                'length_m' => is_numeric($length) ? (float) $length : null,
                'details' => $description,
                'reference_total_qty' => $totalQty,
                'total_qty' => $totalQty,
                'row_no' => is_numeric($no) ? (int) $no : null,
                'header_row' => $headerRowIndex !== null ? $headerRowIndex + 1 : null,
                'material_group' => $currentSection,
                'variant' => $variant,
                'parent_name' => ($isContinuation || ($parentName !== null && $parentName !== $name)) ? $parentName : null,
            ], fn (mixed $value) => $value !== null),
            'embedded_media' => $embeddedMedia,
            'picture_data_url' => $pictureDataUrl,
            'picture_status' => $embeddedMedia['status'] ?? 'none_found',
        ];
    }

    /**
     * @param  array<int, string>  $usedSkus
     */
    protected function generateCatalogSku(?string $code, ?string $name, ?string $variant, int $variantIndex, array &$usedSkus): string
    {
        $base = $code !== null && $code !== ''
            ? strtoupper(Str::limit(trim($code), 45, ''))
            : strtoupper(Str::slug($name ?? 'item', '-'));

        if ($variant !== null && $variant !== $name) {
            $suffix = strtoupper(Str::limit(Str::slug($variant, '-'), 20, ''));
            $sku = $suffix !== '' ? $base.'-'.$suffix : $base.'-'.$variantIndex;
        } elseif ($variantIndex > 1) {
            $sku = $base.'-'.$variantIndex;
        } else {
            $sku = $base;
        }

        $sku = Str::limit($sku, 45, '');
        $original = $sku;
        $counter = $variantIndex;

        while (in_array($sku, $usedSkus, true)) {
            $counter++;
            $sku = Str::limit($original.'-'.$counter, 45, '');
        }

        $usedSkus[] = $sku;

        return $sku;
    }

    protected function seedFabricationHardwareItems(?int $generalDoorTypeId): void
    {
        if ($generalDoorTypeId === null) {
            return;
        }

        foreach (FabricationHardwareAliasMap::entries() as $sourceName => $target) {
            $item = Item::query()->firstOrCreate(
                ['sku' => $target['sku']],
                [
                    'name' => $target['name'],
                    'category' => ItemCategory::Accessory->value,
                    'unit_of_measure' => 'each',
                    'door_type_id' => $generalDoorTypeId,
                    'min_stock_qty' => 0,
                    'is_active' => true,
                    'catalog_tier' => 'standard',
                ],
            );

            Accessory::query()->updateOrCreate(
                ['item_id' => $item->id],
                ['door_type_id' => $generalDoorTypeId, 'default_bin_id' => null],
            );

            $this->resolver->persistAlias(
                warehouseItemId: $item->id,
                sourceSystem: 'wincad',
                sourceCode: null,
                sourceName: $sourceName,
                series: null,
                lineType: ItemCategory::Accessory->value,
            );
        }
    }

    /**
     * @param  array<string, mixed>  $item
     */
    protected function groupImageKey(array $item): string
    {
        $metadata = is_array($item['catalog_metadata'] ?? null) ? $item['catalog_metadata'] : [];
        $parent = $metadata['parent_name'] ?? $item['name'] ?? '';

        return ($metadata['sheet_name'] ?? '').'|'.($item['profile_family'] ?? '').'|'.$parent;
    }

    /**
     * Persist extracted images to temporary extract storage (or reuse existing permanent paths).
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function attachStoredImages(array $items, ?string $catalogTier, ?string $extractToken = null): array
    {
        $normalizedCodes = [];
        $skuKeys = [];

        foreach ($items as $index => $item) {
            $key = (string) ($item['code'] ?? $item['sku'] ?? $item['name'] ?? ('row-'.($item['source_row'] ?? $index)));
            $normalizedCodes[$index] = Str::upper(preg_replace('/[\s_\-]+/', '', trim($key)) ?? trim($key));
            $skuKeys[$index] = mb_strtolower($key);
        }

        $uniqueNormalized = array_values(array_unique(array_filter($normalizedCodes)));
        $uniqueSkus = array_values(array_unique(array_filter($skuKeys)));

        $existingByNormalized = $uniqueNormalized === []
            ? []
            : BinCatalogCode::query()
                ->whereIn('normalized_code', $uniqueNormalized)
                ->whereNotNull('image_path')
                ->pluck('image_path', 'normalized_code')
                ->all();

        $existingBySku = [];
        if ($uniqueSkus !== []) {
            $placeholders = implode(',', array_fill(0, count($uniqueSkus), '?'));
            $existingBySku = Item::query()
                ->whereNotNull('image_path')
                ->whereRaw('lower(sku) in ('.$placeholders.')', $uniqueSkus)
                ->get(['sku', 'image_path'])
                ->mapWithKeys(fn (Item $item) => [mb_strtolower((string) $item->sku) => $item->image_path])
                ->all();
        }

        foreach ($items as $index => $item) {
            $key = (string) ($item['code'] ?? $item['sku'] ?? $item['name'] ?? ('row-'.($item['source_row'] ?? $index)));
            $normalizedCode = $normalizedCodes[$index];
            $skuKey = $skuKeys[$index];

            $existingImagePath = $existingByNormalized[$normalizedCode]
                ?? $existingBySku[$skuKey]
                ?? null;

            // Prefer already-permanent catalog images (never extract-temp paths).
            if (
                is_string($existingImagePath)
                && $existingImagePath !== ''
                && ! $this->images->isExtractPath($existingImagePath)
            ) {
                $items[$index]['image_path'] = $existingImagePath;
                $items[$index]['image_url'] = $this->resolveImageUrl($existingImagePath);
                $items[$index]['picture_status'] = 'existing';
                unset($items[$index]['picture_data_url'], $items[$index]['embedded_media']);
                continue;
            }

            if ($catalogTier === null || $extractToken === null || trim($extractToken) === '') {
                unset($items[$index]['picture_data_url'], $items[$index]['embedded_media']);
                continue;
            }

            $media = is_array($item['embedded_media'] ?? null) ? $item['embedded_media'] : [];
            $binary = is_string($media['binary'] ?? null) ? $media['binary'] : null;
            $mimeType = is_string($media['mime_type'] ?? null) ? $media['mime_type'] : 'image/png';
            $dataUrl = $item['picture_data_url'] ?? $media['data_url'] ?? null;

            $stored = null;
            if ($binary !== null && $binary !== '') {
                $stored = $this->images->storeExtractBinary($binary, $mimeType, $key, $extractToken);
            } elseif (is_string($dataUrl) && str_starts_with($dataUrl, 'data:')) {
                $stored = $this->images->storeExtractDataUrl($dataUrl, $key, $extractToken);
            }

            if ($stored !== null) {
                $items[$index]['image_path'] = $stored['path'];
                $items[$index]['image_url'] = $stored['url'];
                $items[$index]['picture_status'] = 'extract_temp';
            }

            unset($items[$index]['picture_data_url'], $items[$index]['embedded_media']);
        }

        return $items;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<string, mixed>
     */
    protected function buildSummary(array $items): array
    {
        $collection = collect($items);

        return [
            'total_items' => $collection->count(),
            'with_images' => $collection->filter(fn (array $item) => ! empty($item['image_url']))->count(),
            'aluminium_profile' => $collection->where('category', ItemCategory::AluminiumProfile->value)->count(),
            'accessory' => $collection->where('category', ItemCategory::Accessory->value)->count(),
            'rubber' => $collection->where('category', ItemCategory::Rubber->value)->count(),
            'by_sheet' => $collection->groupBy('profile_family')->map->count()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>|null
     */
    protected function catalogMetadata(array $row): ?array
    {
        $metadata = is_array($row['catalog_metadata'] ?? null) ? $row['catalog_metadata'] : [];
        $refTotal = $row['reference_total_qty'] ?? $row['total_qty'] ?? $metadata['reference_total_qty'] ?? $metadata['total_qty'] ?? null;

        if ($refTotal !== null) {
            $metadata['reference_total_qty'] = (float) $refTotal;
            $metadata['reference_total_at'] = now()->toIso8601String();
            $metadata['total_qty'] = (float) $refTotal;
        }

        if (isset($row['length_m'])) {
            $metadata['length_m'] = (float) $row['length_m'];
        }

        $details = $this->clean($row['description'] ?? null);
        if ($details !== null) {
            $metadata['details'] = $details;
        }

        return $metadata === [] ? null : $metadata;
    }

    protected function resolveCatalogTier(?string $requested, ?string $filename): ?string
    {
        if ($requested !== null && in_array($requested, self::TIERS, true)) {
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

    /**
     * @return array<string, mixed>
     */
    protected function serializeCatalogItem(Item $item): array
    {
        $metadata = is_array($item->catalog_metadata) ? $item->catalog_metadata : [];
        $referenceTotalQty = $metadata['reference_total_qty'] ?? $metadata['total_qty'] ?? null;
        $quantityOnHand = number_format((float) ($item->total_quantity_on_hand ?? 0), 3, '.', '');
        $quantityReserved = number_format((float) ($item->total_quantity_reserved ?? 0), 3, '.', '');
        $quantityAvailable = bcsub($quantityOnHand, $quantityReserved, 3);
        $minStockQty = number_format((float) ($item->min_stock_qty ?? 0), 3, '.', '');

        return [
            'id' => $item->id,
            'sku' => $item->sku,
            'name' => $item->name,
            'category' => $item->category?->value ?? $item->category,
            'catalog_tier' => $item->catalog_tier,
            'description' => $item->description,
            'unit_of_measure' => $item->unit_of_measure,
            'image_url' => $this->resolveImageUrl($item->image_path),
            'catalog_metadata' => $item->catalog_metadata,
            'reference_total_qty' => $referenceTotalQty !== null ? (float) $referenceTotalQty : null,
            'reference_total_at' => $metadata['reference_total_at'] ?? null,
            'total_qty' => $referenceTotalQty !== null ? (float) $referenceTotalQty : null,
            'quantity_on_hand' => $quantityOnHand,
            'quantity_reserved' => $quantityReserved,
            'quantity_available' => $quantityAvailable,
            'min_stock_qty' => $minStockQty,
            'stock_status' => $this->determineStockStatus($quantityAvailable, $minStockQty),
            'profile_family' => $item->aluminiumProfile?->profile_family
                ?? ($item->catalog_metadata['material_group'] ?? null),
            'width_mm' => $item->aluminiumProfile?->width_mm,
            'depth_mm' => $item->aluminiumProfile?->depth_mm,
            'standard_bar_length_mm' => $item->aluminiumProfile?->standard_bar_length_mm,
        ];
    }

    protected function determineStockStatus(string $availableQty, string $minStockQty): string
    {
        if (bccomp($availableQty, '0', 3) <= 0) {
            return 'out_of_stock';
        }

        if (bccomp($minStockQty, '0', 3) === 1 && bccomp($availableQty, $minStockQty, 3) < 0) {
            return 'low_stock';
        }

        return 'in_stock';
    }

    protected function resolveImageUrl(?string $imagePath): ?string
    {
        if ($imagePath === null || $imagePath === '') {
            return null;
        }

        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return $imagePath;
        }

        $normalized = ltrim(str_replace('\\', '/', $imagePath), '/');
        if (str_starts_with($normalized, 'public/')) {
            $normalized = substr($normalized, 7);
        }

        return BiboStorage::publicUrlPrefix().'/'.$normalized;
    }

    protected function skuFromName(string $name): string
    {
        return strtoupper(Str::limit(Str::slug($name, '-'), 45, ''));
    }

    protected function clean(?string $value): ?string
    {
        return ExcelRowUtils::clean($value);
    }
}
