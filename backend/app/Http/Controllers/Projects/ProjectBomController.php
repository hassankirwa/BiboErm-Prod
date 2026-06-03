<?php

namespace App\Http\Controllers\Projects;

use App\Enums\ProjectStage;
use App\Events\Projects\ProjectBomFinalized;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\Warehouse\Item;
use App\Services\Media\FileStorageService;
use App\Services\Projects\BomExcelExtractionService;
use App\Services\Projects\ProjectStageService;
use App\Support\ProjectStageGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectBomController extends Controller
{
    public function __construct(
        protected FileStorageService $files,
        protected ProjectStageService $stages,
        protected BomExcelExtractionService $bomExcel,
    ) {}

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        abort_unless(request()->user()->can('projects.bom.view') || request()->user()->can('projects.manage'), 403);

        $bom = ProjectBom::query()
            ->where('project_id', $project->id)
            ->with('lines.warehouseItem')
            ->orderByDesc('version')
            ->first();

        return response()->json([
            'data' => $this->serializeBom($bom),
        ]);
    }

    /**
     * Parse an uploaded BOM file and return JSON for UI review (no database save).
     */
    public function extract(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.bom.upload') || $request->user()->can('projects.manage'), 403);

        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $payload = $this->bomExcel->extractFromUpload($request->file('file'));

        return response()->json([
            'data' => $payload,
        ]);
    }

    /**
     * Persist reviewed BOM lines (from extract preview or manual JSON).
     */
    public function import(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.bom.upload') || $request->user()->can('projects.manage'), 403);

        $this->mergeJsonFormFields($request, ['lines', 'extracted_data']);

        $validated = $request->validate([
            'file' => ['nullable', 'file', 'max:10240'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.line_type' => ['required', 'string', 'max:30'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'lines.*.material_code' => ['nullable', 'string', 'max:50'],
            'lines.*.material_name' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'lines.*.measurement_mm' => ['nullable', 'integer', 'min:0'],
            'lines.*.compatible_profile_code' => ['nullable', 'string', 'max:50'],
            'lines.*.floor_id' => ['nullable', 'exists:project_floors,id'],
            'lines.*.notes' => ['nullable', 'string'],
            'lines.*.row_number' => ['nullable', 'integer', 'min:1'],
            'lines.*.resolution_status' => ['nullable', 'string', 'in:matched,unmatched,procurement_only'],
            'extracted_data' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
        ]);

        $extractedData = $validated['extracted_data'] ?? null;
        if ($extractedData === null && $request->hasFile('file')) {
            $extractedData = $this->bomExcel->extractFromUpload($request->file('file'));
        }

        $storedFile = null;
        if ($request->hasFile('file')) {
            $storedFile = $this->files->store($request->file('file'), 'project-documents', 'project-'.$project->id);
        }

        $bom = $this->persistBom(
            $project,
            $request,
            $validated['lines'],
            $storedFile,
            $extractedData,
            $validated['notes'] ?? null,
        );

        return response()->json([
            'data' => $this->serializeBom($bom),
        ], 201);
    }

    /**
     * @deprecated Prefer extract + import; kept for backward compatibility.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.bom.upload') || $request->user()->can('projects.manage'), 403);

        $validated = $request->validate([
            'file' => ['nullable', 'file', 'max:10240'],
            'lines' => ['nullable', 'array'],
            'lines.*.line_type' => ['required_with:lines', 'string', 'max:30'],
            'lines.*.warehouse_item_id' => ['nullable', 'exists:warehouse_items,id'],
            'lines.*.material_code' => ['nullable', 'string', 'max:50'],
            'lines.*.material_name' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0.001'],
            'lines.*.measurement_mm' => ['nullable', 'integer', 'min:0'],
            'lines.*.compatible_profile_code' => ['nullable', 'string', 'max:50'],
            'lines.*.floor_id' => ['nullable', 'exists:project_floors,id'],
            'lines.*.notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! $request->hasFile('file') && empty($validated['lines'])) {
            throw ValidationException::withMessages([
                'lines' => ['Provide BOM lines or upload a BOM file.'],
            ]);
        }

        $parsedLines = $validated['lines'] ?? [];
        $storedFile = null;
        $extractedData = null;

        if ($request->hasFile('file')) {
            $storedFile = $this->files->store($request->file('file'), 'project-documents', 'project-'.$project->id);
            $extractedData = $this->bomExcel->extractFromUpload($request->file('file'));
            $parsedLines = array_merge(
                $parsedLines,
                $this->mapExtractedLinesForImport($extractedData['lines']),
            );
        }

        if ($parsedLines === []) {
            throw ValidationException::withMessages([
                'file' => ['No BOM lines could be parsed from the upload.'],
            ]);
        }

        $bom = $this->persistBom(
            $project,
            $request,
            $parsedLines,
            $storedFile,
            $extractedData,
            $validated['notes'] ?? null,
        );

        return response()->json([
            'data' => $this->serializeBom($bom),
        ], 201);
    }

    public function updateLine(Request $request, Project $project, ProjectBomLine $line): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.bom.upload') || $request->user()->can('projects.manage'), 403);

        if ((int) $line->bom->project_id !== $project->id) {
            abort(404);
        }

        if ($line->bom->status !== 'draft') {
            throw ValidationException::withMessages([
                'bom' => ['Only draft BOM lines can be edited.'],
            ]);
        }

        $validated = $request->validate([
            'line_type' => ['sometimes', 'string', 'max:30'],
            'warehouse_item_id' => ['nullable', 'exists:warehouse_items,id'],
            'material_code' => ['nullable', 'string', 'max:50'],
            'material_name' => ['sometimes', 'string', 'max:255'],
            'quantity' => ['sometimes', 'numeric', 'min:0.001'],
            'measurement_mm' => ['nullable', 'integer', 'min:0'],
            'compatible_profile_code' => ['nullable', 'string', 'max:50'],
            'floor_id' => ['nullable', 'exists:project_floors,id'],
            'notes' => ['nullable', 'string'],
        ]);

        $line->update($this->normalizeBomLine([
            ...$line->toArray(),
            ...$validated,
        ], (int) $line->sort_order));

        return response()->json([
            'data' => [
                'id' => $line->fresh()->id,
                'bom_id' => $line->bom_id,
                'line_type' => $line->fresh()->line_type,
                'warehouse_item_id' => $line->fresh()->warehouse_item_id,
                'material_code' => $line->fresh()->material_code,
                'material_name' => $line->fresh()->material_name,
                'quantity' => $line->fresh()->quantity,
                'measurement_mm' => $line->fresh()->measurement_mm,
                'is_procurement_only' => $line->fresh()->is_procurement_only,
                'is_glass' => $line->fresh()->is_glass,
                'is_addon' => $line->fresh()->is_addon,
                'notes' => $line->fresh()->notes,
            ],
        ]);
    }

    public function finalize(Request $request, Project $project): JsonResponse
    {
        $this->authorize('advanceStage', $project);
        abort_unless($request->user()->can('projects.bom.finalize') || $request->user()->can('projects.manage'), 403);

        $bom = ProjectBom::query()
            ->where('project_id', $project->id)
            ->where('status', 'draft')
            ->with('lines')
            ->orderByDesc('version')
            ->first();

        if (! $bom) {
            throw ValidationException::withMessages([
                'bom' => ['No draft BOM found for this project.'],
            ]);
        }

        if ($bom->lines->isEmpty()) {
            throw ValidationException::withMessages([
                'bom' => ['A BOM must contain at least one line before finalizing.'],
            ]);
        }

        if (
            $this->stages->currentStage($project) === ProjectStage::FinalDesignApproval
            && ! ProjectStageGate::hasDesignDocument($project)
        ) {
            throw ValidationException::withMessages([
                'documents' => [
                    'Upload at least one design document on the Designs tab before finalizing the BOM.',
                ],
            ]);
        }

        DB::transaction(function () use ($request, $project, $bom) {
            $bom->forceFill([
                'status' => 'finalized',
                'finalized_at' => now(),
                'finalized_by' => $request->user()->id,
            ])->save();

            $this->stages->transition($project, ProjectStage::BomFinalized, $request->user(), [
                'reason' => 'bom_finalized',
            ]);

            ProjectBomFinalized::dispatch(
                projectId: $project->id,
                bomId: $bom->id,
                version: $bom->version,
                finalizedByUserId: $request->user()->id,
                lineSummary: $bom->lines
                    ->filter(fn (ProjectBomLine $line) => ! $line->is_procurement_only && (bool) $line->warehouse_item_id)
                    ->map(fn (ProjectBomLine $line) => [
                        'warehouse_item_id' => $line->warehouse_item_id,
                        'qty_required' => (string) $line->quantity,
                        'project_bom_line_id' => $line->id,
                        'required_length_mm' => $line->measurement_mm,
                        'bom_line_ref' => (string) $line->id,
                    ])
                    ->values()
                    ->all(),
            );
        });

        return response()->json([
            'data' => $this->serializeBom($bom->fresh('lines.warehouseItem')),
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @param  array<string, mixed>|null  $storedFile
     * @param  array<string, mixed>|null  $extractedData
     */
    protected function persistBom(
        Project $project,
        Request $request,
        array $lines,
        ?array $storedFile,
        ?array $extractedData,
        ?string $notes,
    ): ProjectBom {
        return DB::transaction(function () use ($project, $request, $lines, $storedFile, $extractedData, $notes) {
            ProjectBom::query()
                ->where('project_id', $project->id)
                ->whereIn('status', ['draft', 'finalized'])
                ->update(['status' => 'superseded']);

            $version = ((int) ProjectBom::query()->where('project_id', $project->id)->max('version')) + 1;

            $bom = ProjectBom::query()->create([
                'project_id' => $project->id,
                'version' => $version,
                'status' => 'draft',
                'uploaded_by' => $request->user()->id,
                'source_file_path' => $storedFile['path'] ?? null,
                'source_firebase_url' => null,
                'notes' => $notes,
                'extracted_data' => $this->normalizeExtractedDataSnapshot($extractedData),
            ]);

            foreach (array_values($lines) as $index => $line) {
                ProjectBomLine::query()->create([
                    'bom_id' => $bom->id,
                    ...$this->normalizeBomLine($line, $index),
                ]);
            }

            return $bom->load('lines.warehouseItem');
        });
    }

    /**
     * @param  array<string, mixed>|null  $extractedData
     * @return array<string, mixed>|null
     */
    protected function normalizeExtractedDataSnapshot(?array $extractedData): ?array
    {
        if ($extractedData === null) {
            return null;
        }

        return [
            'lines' => $extractedData['lines'] ?? [],
            'summary' => $extractedData['summary'] ?? null,
            'source_filename' => $extractedData['source_filename'] ?? null,
            'imported_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $extractedLines
     * @return array<int, array<string, mixed>>
     */
    protected function mapExtractedLinesForImport(array $extractedLines): array
    {
        return array_map(fn (array $line) => [
            'line_type' => $line['line_type'],
            'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
            'material_code' => $line['material_code'] ?? null,
            'material_name' => $line['material_name'],
            'quantity' => $line['quantity'],
            'measurement_mm' => $line['measurement_mm'] ?? null,
            'notes' => $line['notes'] ?? null,
        ], $extractedLines);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializeBom(?ProjectBom $bom): array
    {
        if (! $bom) {
            return [
                'id' => null,
                'project_id' => null,
                'version' => null,
                'status' => null,
                'lines' => [],
                'extracted_data' => null,
            ];
        }

        return [
            'id' => $bom->id,
            'project_id' => $bom->project_id,
            'version' => $bom->version,
            'status' => $bom->status,
            'source_file_path' => $bom->source_file_path,
            'finalized_at' => $bom->finalized_at?->toIso8601String(),
            'notes' => $bom->notes,
            'extracted_data' => $bom->extracted_data,
            'lines' => $bom->lines->map(fn (ProjectBomLine $line) => [
                'id' => $line->id,
                'line_type' => $line->line_type,
                'warehouse_item_id' => $line->warehouse_item_id,
                'material_code' => $line->material_code,
                'material_name' => $line->material_name,
                'quantity' => $line->quantity,
                'measurement_mm' => $line->measurement_mm,
                'is_procurement_only' => $line->is_procurement_only,
                'is_glass' => $line->is_glass,
                'is_addon' => $line->is_addon,
                'compatible_profile_code' => $line->compatible_profile_code,
                'floor_id' => $line->floor_id,
                'sort_order' => $line->sort_order,
                'notes' => $line->notes,
                'warehouse_item' => $line->relationLoaded('warehouseItem') && $line->warehouseItem ? [
                    'id' => $line->warehouseItem->id,
                    'sku' => $line->warehouseItem->sku,
                    'name' => $line->warehouseItem->name,
                ] : null,
            ])->values()->all(),
        ];
    }

    /**
     * @param  list<string>  $keys
     */
    protected function mergeJsonFormFields(Request $request, array $keys): void
    {
        $merge = [];

        foreach ($keys as $key) {
            $value = $request->input($key);

            if (! is_string($value)) {
                continue;
            }

            $decoded = json_decode($value, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $merge[$key] = $decoded;
            }
        }

        if ($merge !== []) {
            $request->merge($merge);
        }
    }

    /**
     * @param  array<string, mixed>  $line
     * @return array<string, mixed>
     */
    protected function normalizeBomLine(array $line, int $index): array
    {
        $lineType = (string) ($line['line_type'] ?? 'accessory');
        $materialCode = $line['material_code'] ?? null;
        $warehouseItemId = $line['warehouse_item_id'] ?? null;

        if (! $warehouseItemId && $materialCode) {
            $warehouseItemId = Item::query()->where('sku', $materialCode)->value('id');
        }

        $isGlass = $lineType === 'glass' || (bool) ($line['is_glass'] ?? false);
        $isAddon = $lineType === 'addon' || (bool) ($line['is_addon'] ?? false);
        $procurementOnly = $isGlass || $isAddon || (bool) ($line['is_procurement_only'] ?? false);

        if ($procurementOnly) {
            $warehouseItemId = null;
        }

        return [
            'line_type' => $lineType,
            'warehouse_item_id' => $warehouseItemId,
            'material_code' => $materialCode,
            'material_name' => $line['material_name'],
            'quantity' => $line['quantity'],
            'measurement_mm' => $line['measurement_mm'] ?? null,
            'is_procurement_only' => $procurementOnly,
            'is_glass' => $isGlass,
            'is_addon' => $isAddon,
            'compatible_profile_code' => $line['compatible_profile_code'] ?? null,
            'floor_id' => $line['floor_id'] ?? null,
            'sort_order' => $line['sort_order'] ?? $index,
            'notes' => $line['notes'] ?? null,
        ];
    }
}
