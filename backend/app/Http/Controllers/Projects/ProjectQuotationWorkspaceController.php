<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\QuotationResource;
use App\Models\Account;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use App\Services\Design\DesignDocumentBridgeService;
use App\Services\Projects\FabricationExcelExtractionService;
use App\Services\Projects\QuotationAccountingExcelExtractionService;
use App\Services\Projects\QuotationLineEnrichmentService;
use App\Services\Projects\QuotationWorkspaceService;
use App\Services\Projects\WorkbookDrawingExtractor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectQuotationWorkspaceController extends Controller
{
    public function __construct(
        protected QuotationWorkspaceService $workspace,
        protected QuotationAccountingExcelExtractionService $excel,
        protected FabricationExcelExtractionService $fabricationExcel,
        protected QuotationLineEnrichmentService $lineEnrichment,
        protected QuotationCalculatorService $calculator,
        protected DesignDocumentBridgeService $designBridge,
        protected WorkbookDrawingExtractor $drawingExtractor,
    ) {}

    public function pending(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('quotations.view') || $request->user()->can('projects.view'), 403);

        return response()->json([
            'data' => $this->workspace->listPending($request->user()),
        ]);
    }

    public function formAccounts(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('quotations.create'), 403);

        $includeAccountId = $request->query('include_account_id');
        $includeId = is_numeric($includeAccountId) ? (int) $includeAccountId : null;
        $includeDesignJobId = $request->query('include_design_job_id');
        $designJobId = is_numeric($includeDesignJobId) ? (int) $includeDesignJobId : null;

        return response()->json([
            'data' => $this->workspace->listForQuotationForm($request->user(), $includeId, $designJobId),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Quotation::class);

        $quotations = Quotation::query()
            ->excludingReferenceCopies()
            ->with(['account', 'contact', 'lines'])
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return QuotationResource::collection($quotations)->response();
    }

    public function extract(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('quotations.create'), 403);

        $request->validate([
            'file' => ['required', 'file', 'max:20480'],
            'fabrication_file' => ['nullable', 'file', 'max:20480'],
            'account_id' => ['nullable', 'integer', 'exists:accounts,id'],
        ]);

        $payload = $this->excel->extractFromUpload($request->file('file'));

        $fabricationPayload = $this->resolveFabricationPayload($request);
        if ($fabricationPayload !== null) {
            $payload = $this->lineEnrichment->enrich($payload, $fabricationPayload);
        }

        // Ensure embedded drawing binaries never reach JsonResponse (invalid UTF-8).
        $payload = $this->drawingExtractor->sanitizePayloadForJson($payload);

        return response()->json(['data' => $payload]);
    }

    public function fabricationFromAccount(Request $request, Account $account): JsonResponse
    {
        abort_unless($request->user()->can('quotations.create'), 403);
        $this->authorize('view', $account);

        $designDocument = $this->designBridge->latestAccountDocument($account, 'design');
        if (! $designDocument) {
            return response()->json(['message' => 'No saved fabrication document for this account.'], 422);
        }

        $fabricationFile = $this->designBridge->uploadedFileFromDocument($designDocument);
        if (! $fabricationFile) {
            return response()->json(['message' => 'Saved fabrication document could not be read.'], 422);
        }

        $payload = $this->fabricationExcel->extractFromUpload($fabricationFile);
        $payload['design_document'] = [
            'id' => $designDocument->id,
            'filename' => $designDocument->filename,
        ];

        return response()->json(['data' => $payload]);
    }

    public function extractFromAccount(Request $request, Account $account): JsonResponse
    {
        abort_unless($request->user()->can('quotations.create'), 403);
        $this->authorize('view', $account);

        $accountingDocument = $this->designBridge->latestAccountDocument($account, 'accounting');
        if (! $accountingDocument) {
            return response()->json(['message' => 'No saved accounting document for this account.'], 422);
        }

        $accountingFile = $this->designBridge->uploadedFileFromDocument($accountingDocument);
        if (! $accountingFile) {
            return response()->json(['message' => 'Saved accounting document could not be read.'], 422);
        }

        $payload = $this->excel->extractFromUpload($accountingFile);

        $designDocument = $this->designBridge->latestAccountDocument($account, 'design');
        if ($designDocument) {
            $fabricationFile = $this->designBridge->uploadedFileFromDocument($designDocument);
            if ($fabricationFile) {
                $fabricationPayload = $this->fabricationExcel->extractFromUpload($fabricationFile);
                $payload = $this->lineEnrichment->enrich($payload, $fabricationPayload);
            }
        }

        $payload = $this->drawingExtractor->sanitizePayloadForJson($payload);

        return response()->json(['data' => $payload]);
    }

    public function generateFromAccount(Request $request, Account $account): JsonResponse
    {
        abort_unless($request->user()->can('quotations.create'), 403);
        $this->authorize('view', $account);

        $quotation = $this->workspace->generateFromAccountDocuments($account, $request->user());

        return (new QuotationResource($quotation))->response()->setStatusCode(
            $quotation->wasRecentlyCreated ? 201 : 200,
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('quotations.create'), 403);

        $this->mergeJsonFormFields($request, ['lines', 'extracted_data']);

        $validated = $request->validate([
            'account_id' => ['required', 'exists:accounts,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'project_name' => ['nullable', 'string', 'max:255'],
            'project_number' => ['nullable', 'string', 'max:50'],
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'file' => ['nullable', 'file', 'max:20480'],
            'fabrication_file' => ['nullable', 'file', 'max:20480'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string'],
            'lines.*.series' => ['nullable', 'string', 'max:120'],
            'lines.*.code' => ['nullable', 'string', 'max:50'],
            'lines.*.glass_type' => ['nullable', 'string', 'max:255'],
            'lines.*.width_mm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.height_mm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.sqm_per_pcs' => ['nullable', 'numeric', 'min:0'],
            'lines.*.total_sqm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.metadata' => ['nullable', 'array'],
            'lines.*.sort_order' => ['nullable', 'integer'],
        ]);

        $account = Account::query()->findOrFail($validated['account_id']);
        $this->authorize('view', $account);

        $quotation = $this->workspace->createFromPayload(
            $account,
            $request->user(),
            $validated,
            $request->file('file'),
            $request->file('fabrication_file'),
        );

        return (new QuotationResource($quotation))->response()->setStatusCode(201);
    }

    public function show(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('view', $quotation);

        $quotation->load(['lines', 'account', 'contact', 'preparedBy', 'deal', 'deal.project']);

        if ($request->query('include') === 'history') {
            $quotation->setRelation(
                'revisionHistory',
                $this->calculator->revisionHistory($quotation),
            );
        }

        return new QuotationResource($quotation);
    }

    public function update(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('view', $quotation);
        abort_unless($request->user()->can('quotations.create'), 403);

        $this->mergeJsonFormFields($request, ['lines']);

        $validated = $request->validate([
            'project_name' => ['nullable', 'string', 'max:255'],
            'project_number' => ['nullable', 'string', 'max:50'],
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.description' => ['required_with:lines', 'string'],
            'lines.*.series' => ['nullable', 'string', 'max:120'],
            'lines.*.code' => ['nullable', 'string', 'max:50'],
            'lines.*.glass_type' => ['nullable', 'string', 'max:255'],
            'lines.*.width_mm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.height_mm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.sqm_per_pcs' => ['nullable', 'numeric', 'min:0'],
            'lines.*.total_sqm' => ['nullable', 'numeric', 'min:0'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.metadata' => ['nullable', 'array'],
            'lines.*.sort_order' => ['nullable', 'integer'],
        ]);

        if (array_key_exists('project_name', $validated) || array_key_exists('project_number', $validated) || array_key_exists('tax_rate', $validated)) {
            $quotation->update(array_filter([
                'project_name' => $validated['project_name'] ?? null,
                'project_number' => $validated['project_number'] ?? null,
                'tax_rate' => $validated['tax_rate'] ?? null,
            ], fn ($value) => $value !== null));
        }

        $updated = $this->calculator->updateStructuredDraft($quotation, $validated);

        return new QuotationResource($updated->load(['lines', 'account', 'contact', 'preparedBy']));
    }

    public function preview(Quotation $quotation): JsonResponse
    {
        $this->authorize('view', $quotation);

        $quotation->load(['lines', 'account', 'contact']);

        return response()->json([
            'data' => [
                'quotation' => new QuotationResource($quotation),
                'bank_details' => config('bibo.quotation.bank_details'),
                'company' => [
                    'name' => 'BIBO WINDOWS & DOORS',
                    'title' => 'ALUMINIUM WINDOWS AND DOORS QUOTATION',
                ],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function resolveFabricationPayload(Request $request): ?array
    {
        if ($request->hasFile('fabrication_file')) {
            return $this->fabricationExcel->extractFromUpload($request->file('fabrication_file'));
        }

        if (! $request->filled('account_id')) {
            return null;
        }

        $account = Account::query()->findOrFail($request->integer('account_id'));
        $this->authorize('view', $account);

        $designDocument = $this->designBridge->latestAccountDocument($account, 'design');
        if (! $designDocument) {
            return null;
        }

        $fabricationFile = $this->designBridge->uploadedFileFromDocument($designDocument);
        if (! $fabricationFile) {
            return null;
        }

        return $this->fabricationExcel->extractFromUpload($fabricationFile);
    }

    protected function mergeJsonFormFields(Request $request, array $fields): void
    {
        foreach ($fields as $field) {
            $raw = $request->input($field);
            if (is_string($raw)) {
                $decoded = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }
    }
}
