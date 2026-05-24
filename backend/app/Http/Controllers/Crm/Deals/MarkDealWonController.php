<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Services\Crm\Deals\DealStageService;
use Illuminate\Http\Request;

class MarkDealWonController extends Controller
{
    public function __construct(
        protected DealStageService $dealStageService,
    ) {}

    public function __invoke(Request $request, Deal $deal): DealResource
    {
        $this->authorize('markWon', $deal);

        $override = $request->boolean('override_deposit')
            && $request->user()->hasRole('super_admin');

        $updated = $this->dealStageService->markWon($deal, $request->user(), $override);

        return new DealResource($updated);
    }
}
