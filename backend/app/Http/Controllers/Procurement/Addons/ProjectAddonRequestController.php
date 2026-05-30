<?php

namespace App\Http\Controllers\Procurement\Addons;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\ProjectAddonRequestResource;
use App\Models\Procurement\ProjectAddonRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectAddonRequestController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ProjectAddonRequest::class);

        $query = ProjectAddonRequest::query()->with(['project', 'requisition'])->latest();
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        return ProjectAddonRequestResource::collection($query->paginate($request->integer('per_page', 25)));
    }
}
