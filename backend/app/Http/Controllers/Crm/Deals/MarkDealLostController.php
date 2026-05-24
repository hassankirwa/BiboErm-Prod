<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Services\Crm\Deals\DealStageService;
use Illuminate\Http\Request;

class MarkDealLostController extends Controller
{
    public function __construct(
        protected DealStageService $dealStageService,
    ) {}

    public function __invoke(Request $request, Deal $deal): DealResource
    {
        $this->authorize('markLost', $deal);

        $validated = $request->validate([
            'loss_reason_id' => ['nullable', 'exists:crm_loss_reasons,id'],
            'loss_notes' => ['nullable', 'string'],
            'lost_reason' => ['nullable', 'string'],
        ]);

        $updated = $this->dealStageService->markLost($deal, $request->user(), $validated);

        return new DealResource($updated);
    }
}
