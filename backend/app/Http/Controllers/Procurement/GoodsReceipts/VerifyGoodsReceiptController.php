<?php

namespace App\Http\Controllers\Procurement\GoodsReceipts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GoodsReceiptResource;
use App\Models\Procurement\GoodsReceipt;
use App\Services\Procurement\GoodsReceipts\GoodsReceiptService;
use Illuminate\Http\Request;

class VerifyGoodsReceiptController extends Controller
{
    public function __construct(protected GoodsReceiptService $service) {}

    public function __invoke(Request $request, GoodsReceipt $goodsReceipt): GoodsReceiptResource
    {
        $this->authorize('verify', $goodsReceipt);

        return new GoodsReceiptResource($this->service->verify($goodsReceipt, $request->user()));
    }
}
