<?php

namespace App\Http\Controllers\Crm\Lookups;

use App\Http\Controllers\Controller;
use App\Models\County;
use App\Models\LeadSource;
use App\Models\LeadType;
use App\Models\LossReason;
use App\Models\ProductInterest;
use App\Models\VisitPurpose;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmLookupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $activeOnly = $request->boolean('active_only', true);

        $query = fn (string $modelClass) => $modelClass::query()
            ->when($activeOnly, fn ($q) => $q->where('is_active', true))
            ->orderBy('label')
            ->get(['id', 'slug', 'label', 'is_active']);

        return response()->json([
            'data' => [
                'lead_sources' => $query(LeadSource::class),
                'lead_types' => $query(LeadType::class),
                'product_interests' => $query(ProductInterest::class),
                'counties' => $query(County::class),
                'loss_reasons' => $query(LossReason::class),
                'visit_purposes' => $query(VisitPurpose::class),
            ],
        ]);
    }
}
