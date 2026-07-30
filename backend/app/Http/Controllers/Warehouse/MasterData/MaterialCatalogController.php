<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Http\Controllers\Controller;
use App\Services\Warehouse\MasterData\BinCatalogExcelService;
use App\Services\Warehouse\MasterData\WarehouseMaterialCatalogExcelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MaterialCatalogController extends Controller
{
    public function __construct(
        protected BinCatalogExcelService $catalogs,
        protected WarehouseMaterialCatalogExcelService $richCatalog,
    ) {}

    protected function catalogWorkbookMaxKb(): int
    {
        return max(1, (int) config('bibo.warehouse.material_catalog_workbook_max_kb', 153600));
    }

    /**
     * @return array<int, string|int>
     */
    protected function catalogWorkbookFileRules(bool $required = true): array
    {
        $rules = ['file', 'max:'.$this->catalogWorkbookMaxKb()];

        return $required ? array_merge(['required'], $rules) : array_merge(['nullable'], $rules);
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->can('warehouse.master_data.view') || $request->user()->can('warehouse.master_data.manage'),
            403,
        );

        $request->validate([
            'catalog_tier' => ['nullable', 'string', 'in:premium,standard,balustrade,specialty'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json([
            'data' => $this->catalogs->listCatalogBins(
                $request->input('catalog_tier'),
                $request->input('search'),
            ),
        ]);
    }

    public function catalogItems(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->can('warehouse.master_data.view')
            || $request->user()->can('warehouse.master_data.manage')
            || $request->user()->can('warehouse.view')
            || $request->user()->can('warehouse.stock.view'),
            403,
        );

        $request->validate([
            'catalog_tier' => ['nullable', 'string', 'in:premium,standard,balustrade,specialty'],
            'category' => ['nullable', 'string', 'in:aluminium_profile,accessory,rubber'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $result = $this->richCatalog->listCatalogItems(
            $request->input('catalog_tier'),
            $request->input('search'),
            $request->input('category'),
            $request->integer('page', 1),
            $request->integer('per_page', 20),
        );

        return response()->json($result);
    }

    public function extract(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('warehouse.master_data.manage'), 403);

        @set_time_limit(0);
        @ini_set('max_execution_time', '0');
        @ini_set('memory_limit', '1024M');

        $request->validate([
            'file' => $this->catalogWorkbookFileRules(),
            'catalog_tier' => ['nullable', 'string', 'in:premium,standard,balustrade,specialty'],
        ]);

        $extractToken = (string) Str::uuid();
        $data = $this->catalogs->extractFromUpload(
            $request->file('file'),
            $request->input('catalog_tier'),
            $extractToken,
        );

        return response()->json([
            'data' => $data,
            'meta' => [
                'extract_token' => $data['extract_token'] ?? $extractToken,
            ],
        ]);
    }

    public function discardExtract(Request $request, string $token): JsonResponse
    {
        abort_unless($request->user()->can('warehouse.master_data.manage'), 403);

        $this->catalogs->discardExtract($token);

        return response()->json(['data' => ['discarded' => true]]);
    }

    public function import(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('warehouse.master_data.manage'), 403);

        @set_time_limit(0);
        @ini_set('max_execution_time', '0');
        @ini_set('memory_limit', '1024M');

        $request->validate([
            'file' => $this->catalogWorkbookFileRules(required: false),
            'codes' => ['nullable', 'array'],
            'items' => ['nullable', 'array'],
            'extract_token' => ['nullable', 'string', 'max:80'],
            'catalog_tier' => ['nullable', 'string', 'in:premium,standard,balustrade,specialty'],
        ]);

        $codes = $request->input('codes');
        $items = $request->input('items');
        $catalogTier = $request->input('catalog_tier');
        $extractToken = $request->input('extract_token');
        $sourceFile = $request->file('file')?->getClientOriginalName();

        if (! is_array($codes) && $request->hasFile('file')) {
            $extracted = $this->catalogs->extractFromUpload(
                $request->file('file'),
                $catalogTier,
                is_string($extractToken) ? $extractToken : null,
            );
            $codes = $extracted['codes'];
            $items = $extracted['items'] ?? [];
            $catalogTier = $extracted['catalog_tier'];
            $extractToken = $extracted['extract_token'] ?? $extractToken;
            $sourceFile = $extracted['source_filename'] ?? $sourceFile;
        }

        abort_if(! is_array($codes) || $codes === [], 422, 'Provide parsed codes or upload a bin catalog file.');
        abort_if(! is_string($catalogTier) || $catalogTier === '', 422, 'catalog_tier is required when importing parsed codes.');

        return response()->json([
            'data' => $this->catalogs->importCatalog(
                $codes,
                $catalogTier,
                $sourceFile,
                is_string($extractToken) ? $extractToken : null,
                is_array($items) ? $items : null,
            ),
        ], 201);
    }

    public function export(Request $request)
    {
        abort_unless($request->user()->can('warehouse.master_data.view') || $request->user()->can('warehouse.master_data.manage'), 403);

        $path = $this->catalogs->exportCodes();

        return response()
            ->download($path, 'warehouse-bin-catalog.xlsx')
            ->deleteFileAfterSend(true);
    }
}
