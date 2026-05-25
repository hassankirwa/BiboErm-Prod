<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Services\Crm\Deals\DealStageService;
use Illuminate\Http\Request;

class UpdateDealStageController extends Controller
{
    public function __construct(
        protected DealStageService $dealStageService,
    ) {}

    public function __invoke(Request $request, Deal $deal): DealResource
    {
        $this->authorize('update', $deal);

        $validated = $request->validate([
            'stage' => ['required', 'string', 'max:64'],
        ]);

        $updated = $this->dealStageService->updateStage(
            $deal,
            $validated['stage'],
            $request->user()
        );

        return new DealResource($updated);
    }
}
