<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\StoreCuttingSheetRequest;
use App\Http\Requests\Production\UpdateCuttingSheetLineRequest;
use App\Http\Resources\Production\CuttingSheetResource;
use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Services\Production\CuttingSheetGeneratorService;
use App\Services\Production\CuttingSheetService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CuttingSheetController extends Controller
{
    public function __construct(
        protected CuttingSheetGeneratorService $generator,
        protected CuttingSheetService $cuttingSheets,
    ) {}

    public function index(ProductionOrder $order): AnonymousResourceCollection
    {
        $this->authorize('view', $order);

        return CuttingSheetResource::collection(
            $order->cuttingSheets()
                ->with(['warehouseItem.aluminiumProfile'])
                ->orderBy('sort_order')
                ->get()
        );
    }

    public function store(StoreCuttingSheetRequest $request, ProductionOrder $order): AnonymousResourceCollection
    {
        $this->authorize('manageStages', $order);

        $sheets = $this->generator->generate(
            order: $order,
            user: $request->user(),
            replaceExisting: $request->boolean('replace_existing', true),
        );

        return CuttingSheetResource::collection($sheets);
    }

    public function update(
        UpdateCuttingSheetLineRequest $request,
        ProductionOrder $order,
        CuttingSheet $line,
    ): CuttingSheetResource {
        $this->authorize('manageStages', $order);

        $updated = $this->cuttingSheets->updateLine(
            order: $order,
            line: $line,
            user: $request->user(),
            data: $request->validated(),
        );

        return new CuttingSheetResource($updated);
    }
}
