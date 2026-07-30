<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Http\Controllers\Controller;
use App\Services\Warehouse\MasterData\MaterialBinMapper;
use App\Services\Warehouse\MasterData\MaterialMasterExcelService;
use App\Services\Warehouse\MasterData\MaterialMasterSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialMasterController extends Controller
{
    public function __construct(
        protected MaterialMasterExcelService $materials,
        protected MaterialBinMapper $mapper,
        protected MaterialMasterSyncService $sync,
    ) {}

    public function extract(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('warehouse.master_data.manage'), 403);
        $request->validate([
            'file' => ['required', 'file', 'max:153600'],
        ]);

        $extracted = $this->materials->extractFromUpload($request->file('file'));
        $extracted['items'] = $this->mapper->mapItems($extracted['items']);
        $preview = $this->sync->previewItems($extracted['items']);
        $extracted['items'] = $preview['items'];
        $extracted['bins'] = $this->mapper->availableBins();
        $extracted['summary']['mapped_items'] = collect($extracted['items'])->whereNotNull('bin_id')->count();
        $extracted['summary']['unmapped_items'] = collect($extracted['items'])->whereNull('bin_id')->count();
        $extracted['summary']['by_section'] = collect($extracted['items'])
            ->whereNotNull('section_code')
            ->countBy('section_code')
            ->all();
        $extracted['summary']['new'] = $preview['counts']['new'];
        $extracted['summary']['changed'] = $preview['counts']['changed'];
        $extracted['summary']['unchanged'] = $preview['counts']['unchanged'];

        return response()->json(['data' => $extracted]);
    }

    public function import(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('warehouse.master_data.manage'), 403);
        $request->validate([
            'file' => ['nullable', 'file', 'max:153600'],
            'items' => ['nullable', 'array'],
            'items.*.code' => ['required_with:items', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
        ]);

        $items = $request->input('items');
        if (! is_array($items) && $request->hasFile('file')) {
            $items = $this->mapper->mapItems(
                $this->materials->extractFromUpload($request->file('file'))['items'],
            );
        }
        abort_if(! is_array($items) || $items === [], 422, 'Provide parsed items or upload a material list file.');

        return response()->json([
            'data' => $this->sync->syncItems($items),
        ], 201);
    }
}
