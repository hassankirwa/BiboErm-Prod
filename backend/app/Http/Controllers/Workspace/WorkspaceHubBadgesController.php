<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Services\Workspace\WorkspaceHubBadgesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceHubBadgesController extends Controller
{
    public function __construct(
        protected WorkspaceHubBadgesService $badges,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->badges->badgesFor($request->user()),
        ]);
    }
}
