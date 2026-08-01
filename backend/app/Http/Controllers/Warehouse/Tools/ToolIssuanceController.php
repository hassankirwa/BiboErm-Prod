<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\ToolIssuanceResource;
use App\Models\Warehouse\ToolIssuance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ToolIssuanceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ToolIssuance::query()
            ->with(['tool', 'project', 'issuedToUser', 'issuedByUser', 'fieldToolAssignment.job'])
            ->latest('issue_date')
            ->latest('id');

        if ($request->boolean('open_only', true)) {
            $query->whereNull('return_date');
        }

        if ($projectId = $request->integer('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($request->boolean('installation_only')) {
            $query->whereHas('project', function ($q): void {
                $q->whereIn('stage', [
                    'qc_pre_installation',
                    'in_transit',
                    'installation',
                    'site_qc',
                    'snagging',
                ]);
            });
        }

        return ToolIssuanceResource::collection($query->get());
    }
}
