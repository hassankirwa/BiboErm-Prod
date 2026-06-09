<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Projects\QuotationExcelExtractionService;
use App\Services\Projects\QuotationWorkspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectDesignController extends Controller
{
    public function __construct(
        protected QuotationWorkspaceService $workspace,
        protected QuotationExcelExtractionService $fabricationExcel,
    ) {}

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
}
