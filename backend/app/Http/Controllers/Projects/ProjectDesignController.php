<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Http\Resources\Projects\ProjectDesignQueueResource;
use App\Models\Project;
use App\Services\Projects\ProjectDesignService;
use App\Services\Projects\ProjectFabricationImportService;
use App\Services\Projects\QuotationExcelExtractionService;
use App\Services\Projects\QuotationWorkspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectDesignController extends Controller
{
    public function __construct(
        protected QuotationWorkspaceService $workspace,
        protected QuotationExcelExtractionService $fabricationExcel,
        protected ProjectDesignService $designService,
        protected ProjectFabricationImportService $fabricationImport,
    ) {}

    public function queue(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('projects.view'), 403);

        return response()->json([
            'data' => ProjectDesignQueueResource::collection(
                $this->designService->listDesignQueue($request->user()),
            ),
        ]);
    }

    public function pending(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('projects.view') || $request->user()->can('quotations.view'), 403);

        return response()->json([
            'data' => $this->workspace->listDesignPending($request->user()),
        ]);
    }

    public function extract(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('projects.view') || $request->user()->can('quotations.view'), 403);

        $request->validate([
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $payload = $this->fabricationExcel->extractFromUpload($request->file('file'));

        return response()->json(['data' => $payload]);
    }

    /**
     * Upload a fabrication list to a project: extract openings, persist elevation
     * images and descriptions as design documents for production.
     */
    public function importFabrication(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless(
            $request->user()->can('projects.documents.upload') || $request->user()->can('projects.manage'),
            403,
        );

        @set_time_limit(0);
        @ini_set('memory_limit', '512M');

        $request->validate([
            'file' => ['required', 'file', 'max:51200'],
        ]);

        $result = $this->fabricationImport->import(
            $project,
            $request->file('file'),
            $request->user(),
        );

        return response()->json(['data' => $result], 201);
    }
}
