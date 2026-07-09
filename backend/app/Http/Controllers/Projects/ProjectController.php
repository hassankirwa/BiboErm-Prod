<?php

namespace App\Http\Controllers\Projects;

use App\Enums\ProjectStage;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\ProjectDelay;
use App\Models\User;
use App\Services\Projects\ProjectDashboardService;
use App\Services\Projects\ProjectDealSyncService;
use App\Services\Projects\ProjectStageService;
use App\Support\BiboStorage;
use App\Support\ProjectStageAdvance;
use App\Support\ProjectStageGate;
use App\Support\SiteAssessmentData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProjectController extends Controller
{
    /** @var list<string> */
    public const SITE_ASSESSMENT_SHAPES = [
        'rectangle',
        'l_shape',
        'pentagon',
        'hexagon',
        'irregular',
    ];

    public function __construct(
        protected ProjectStageService $stages,
        protected ProjectDashboardService $dashboard,
        protected ProjectDealSyncService $dealSync,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()
            ->visibleTo($request->user())
            ->with(['projectManager', 'salesRep', 'latestBom.lines'])
            ->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        if ($stage = $request->query('stage')) {
            $query->where('stage', $stage);
        }

        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }

        if ($projectManagerId = $request->query('project_manager_id')) {
            $query->where('project_manager_id', $projectManagerId);
        }

        if ($bucket = $request->query('bucket')) {
            $this->applyBucketFilter($query, (string) $bucket);
        }

        return ProjectResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): ProjectResource
    {
        $this->authorize('create', Project::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'account_id' => ['required', 'exists:accounts,id'],
            'deal_id' => ['nullable', 'exists:deals,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'type' => ['nullable', 'string', 'max:64'],
            'location_type' => ['nullable', 'string', 'max:32', 'in:nairobi,outside_nairobi'],
            'site_address' => ['nullable', 'string'],
            'priority' => ['nullable', 'string', 'max:32'],
            'quoted_amount' => ['nullable', 'numeric', 'min:0'],
            'deposit_received' => ['nullable', 'numeric', 'min:0'],
            'overage_buffer_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'projected_start' => ['nullable', 'date'],
            'projected_end' => ['nullable', 'date'],
            'sales_rep_id' => ['nullable', 'exists:users,id'],
            'project_manager_id' => ['nullable', 'exists:users,id'],
            'client_notes' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        if (empty($validated['sales_rep_id'])) {
            $validated['sales_rep_id'] = $user->id;
        }

        $project = Project::query()->create([
            ...$validated,
            'reference' => 'PR-'.strtoupper(Str::random(8)),
            'stage' => ProjectStage::AwaitingDeposit->value,
        ]);

        $this->stages->initialize($project, $user);

        return new ProjectResource(
            $project->fresh(['projectManager', 'salesRep', 'latestBom.lines'])
        );
    }

    public function show(Project $project): ProjectResource
    {
        $this->authorize('view', $project);

        $project = $this->dealSync->syncFromDeal($project, request()->user());

        return new ProjectResource(
            $project->load([
                'deal',
                'contact',
                'account',
                'salesRep',
                'projectManager',
                'latestBom.lines.warehouseItem',
                'documents.uploader',
                'engineers.user',
                'floors',
                'delays.logger',
                'stageLogs',
            ])
        );
    }

    public function measurementVisits(Project $project): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        $visits = $project->siteVisits()
            ->where('measurement_context', 'production')
            ->with(['assignedFieldOfficer', 'approvedBy'])
            ->latest()
            ->get();

        return \App\Http\Resources\Crm\SiteVisitResource::collection($visits);
    }

    public function update(Request $request, Project $project): ProjectResource
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'account_id' => ['sometimes', 'exists:accounts,id'],
            'type' => ['sometimes', 'string', 'max:64'],
            'location_type' => ['sometimes', 'string', 'max:32', 'in:nairobi,outside_nairobi'],
            'site_address' => ['nullable', 'string'],
            'priority' => ['sometimes', 'string', 'max:32'],
            'quoted_amount' => ['nullable', 'numeric', 'min:0'],
            'deposit_received' => ['nullable', 'numeric', 'min:0'],
            'overage_buffer_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'projected_start' => ['nullable', 'date'],
            'projected_end' => ['nullable', 'date'],
            'actual_start' => ['nullable', 'date'],
            'actual_end' => ['nullable', 'date'],
            'sales_rep_id' => ['nullable', 'exists:users,id'],
            'project_manager_id' => ['nullable', 'exists:users,id'],
            'client_notes' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $project->update($validated);

        return new ProjectResource(
            $project->fresh(['projectManager', 'salesRep', 'latestBom.lines'])
        );
    }

    public function assignProjectManager(Request $request, Project $project): ProjectResource
    {
        $this->authorize('assignPm', $project);

        $validated = $request->validate([
            'project_manager_id' => ['required', 'exists:users,id'],
        ]);

        $project->forceFill([
            'project_manager_id' => $validated['project_manager_id'],
        ])->save();

        return new ProjectResource(
            $project->fresh(['projectManager', 'salesRep', 'latestBom.lines'])
        );
    }

    public function updateSiteAssessmentNotes(Request $request, Project $project): ProjectResource
    {
        $this->authorize('recordSiteAssessmentNotes', $project);

        if ($this->stages->currentStage($project) !== ProjectStage::SiteAssessment) {
            throw ValidationException::withMessages([
                'stage' => ['Site assessment data can only be updated while the project is in site assessment.'],
            ]);
        }

        $measurementItemRules = [
            '*.label' => ['required', 'string', 'max:100'],
            '*.width_ft' => ['nullable', 'numeric', 'min:0'],
            '*.height_ft' => ['nullable', 'numeric', 'min:0'],
            '*.width_mm' => ['nullable', 'numeric', 'min:0'],
            '*.height_mm' => ['nullable', 'numeric', 'min:0'],
            '*.notes' => ['nullable', 'string'],
        ];

        $imageRules = [
            '*.path' => ['required', 'string', 'max:512'],
            '*.url' => ['nullable', 'string', 'max:2048'],
            '*.original_name' => ['required', 'string', 'max:255'],
        ];

        $spatialItemRules = [
            ...$measurementItemRules,
            '*.shape' => ['nullable', 'string', Rule::in(self::SITE_ASSESSMENT_SHAPES)],
            '*.dimensions_description' => ['nullable', 'string'],
            '*.side_measurements_ft' => ['nullable', 'array'],
            '*.side_measurements_ft.*' => ['nullable', 'numeric', 'min:0'],
            '*.images' => ['nullable', 'array'],
            '*.images.*.path' => $imageRules['*.path'],
            '*.images.*.url' => $imageRules['*.url'],
            '*.images.*.original_name' => $imageRules['*.original_name'],
        ];

        $validated = $request->validate([
            'doors_count' => ['nullable', 'integer', 'min:0'],
            'doors' => ['nullable', 'array'],
            'doors.*.label' => $measurementItemRules['*.label'],
            'doors.*.width_ft' => $measurementItemRules['*.width_ft'],
            'doors.*.height_ft' => $measurementItemRules['*.height_ft'],
            'doors.*.width_mm' => $measurementItemRules['*.width_mm'],
            'doors.*.height_mm' => $measurementItemRules['*.height_mm'],
            'doors.*.notes' => $measurementItemRules['*.notes'],
            'windows_count' => ['nullable', 'integer', 'min:0'],
            'windows' => ['nullable', 'array'],
            'windows.*.label' => $measurementItemRules['*.label'],
            'windows.*.width_ft' => $measurementItemRules['*.width_ft'],
            'windows.*.height_ft' => $measurementItemRules['*.height_ft'],
            'windows.*.width_mm' => $measurementItemRules['*.width_mm'],
            'windows.*.height_mm' => $measurementItemRules['*.height_mm'],
            'windows.*.notes' => $measurementItemRules['*.notes'],
            'balconies_count' => ['nullable', 'integer', 'min:0'],
            'balconies' => ['nullable', 'array'],
            'balconies.*.label' => $spatialItemRules['*.label'],
            'balconies.*.width_ft' => $spatialItemRules['*.width_ft'],
            'balconies.*.height_ft' => $spatialItemRules['*.height_ft'],
            'balconies.*.width_mm' => $spatialItemRules['*.width_mm'],
            'balconies.*.height_mm' => $spatialItemRules['*.height_mm'],
            'balconies.*.notes' => $spatialItemRules['*.notes'],
            'balconies.*.shape' => $spatialItemRules['*.shape'],
            'balconies.*.dimensions_description' => $spatialItemRules['*.dimensions_description'],
            'balconies.*.side_measurements_ft' => $spatialItemRules['*.side_measurements_ft'],
            'balconies.*.side_measurements_ft.*' => $spatialItemRules['*.side_measurements_ft.*'],
            'balconies.*.images' => $spatialItemRules['*.images'],
            'balconies.*.images.*.path' => $spatialItemRules['*.images.*.path'],
            'balconies.*.images.*.url' => $spatialItemRules['*.images.*.url'],
            'balconies.*.images.*.original_name' => $spatialItemRules['*.images.*.original_name'],
            'bathrooms_count' => ['nullable', 'integer', 'min:0'],
            'bathrooms' => ['nullable', 'array'],
            'bathrooms.*.label' => $spatialItemRules['*.label'],
            'bathrooms.*.width_ft' => $spatialItemRules['*.width_ft'],
            'bathrooms.*.height_ft' => $spatialItemRules['*.height_ft'],
            'bathrooms.*.width_mm' => $spatialItemRules['*.width_mm'],
            'bathrooms.*.height_mm' => $spatialItemRules['*.height_mm'],
            'bathrooms.*.notes' => $spatialItemRules['*.notes'],
            'bathrooms.*.shape' => $spatialItemRules['*.shape'],
            'bathrooms.*.dimensions_description' => $spatialItemRules['*.dimensions_description'],
            'bathrooms.*.side_measurements_ft' => $spatialItemRules['*.side_measurements_ft'],
            'bathrooms.*.side_measurements_ft.*' => $spatialItemRules['*.side_measurements_ft.*'],
            'bathrooms.*.images' => $spatialItemRules['*.images'],
            'bathrooms.*.images.*.path' => $spatialItemRules['*.images.*.path'],
            'bathrooms.*.images.*.url' => $spatialItemRules['*.images.*.url'],
            'bathrooms.*.images.*.original_name' => $spatialItemRules['*.images.*.original_name'],
            'additional_images' => ['nullable', 'array'],
            'additional_images.*.path' => $imageRules['*.path'],
            'additional_images.*.url' => $imageRules['*.url'],
            'additional_images.*.original_name' => $imageRules['*.original_name'],
            'operational_notes' => ['nullable', 'string'],
            'access_constraints' => ['nullable', 'string'],
            'fabrication_concerns' => ['nullable', 'string'],
        ]);

        $hasStructuredData = collect([
            $validated['doors_count'] ?? null,
            $validated['windows_count'] ?? null,
            $validated['balconies_count'] ?? null,
            $validated['bathrooms_count'] ?? null,
        ])->contains(fn ($value) => $value !== null && $value !== '');

        $hasNotes = trim((string) ($validated['operational_notes'] ?? '')) !== ''
            || trim((string) ($validated['access_constraints'] ?? '')) !== ''
            || trim((string) ($validated['fabrication_concerns'] ?? '')) !== '';

        $hasImages = ! empty($validated['additional_images'])
            || collect(['balconies', 'bathrooms'])->contains(function (string $field) use ($validated) {
                foreach ($validated[$field] ?? [] as $item) {
                    if (! empty($item['images'])) {
                        return true;
                    }
                }

                return false;
            });

        if (! $hasStructuredData && ! $hasNotes && ! $hasImages) {
            throw ValidationException::withMessages([
                'site_assessment' => ['Provide opening counts, measurements, or operational notes.'],
            ]);
        }

        $existing = is_array($project->stage_data) ? $project->stage_data : [];
        $assessment = is_array($existing['site_assessment'] ?? null)
            ? $existing['site_assessment']
            : [];

        $updates = [];

        foreach (['doors_count', 'windows_count', 'balconies_count', 'bathrooms_count'] as $countField) {
            if (array_key_exists($countField, $validated)) {
                $updates[$countField] = $validated[$countField];
            }
        }

        foreach (['doors', 'windows'] as $arrayField) {
            if (array_key_exists($arrayField, $validated) && is_array($validated[$arrayField])) {
                $updates[$arrayField] = $this->normalizeMeasurementItems($validated[$arrayField]);
            }
        }

        foreach (['balconies', 'bathrooms'] as $arrayField) {
            if (array_key_exists($arrayField, $validated) && is_array($validated[$arrayField])) {
                $updates[$arrayField] = $this->normalizeSpatialMeasurementItems(
                    $validated[$arrayField],
                    $project->id,
                );
            }
        }

        if (array_key_exists('additional_images', $validated) && is_array($validated['additional_images'])) {
            $updates['additional_images'] = $this->normalizeAssessmentImages(
                $validated['additional_images'],
                $project->id,
            );
        }

        foreach (['operational_notes', 'access_constraints', 'fabrication_concerns'] as $noteField) {
            if (array_key_exists($noteField, $validated)) {
                $updates[$noteField] = trim((string) $validated[$noteField]) ?: null;
            }
        }

        $existing['site_assessment'] = [
            ...$assessment,
            ...$updates,
            'operational_recorded_by' => $request->user()->id,
            'operational_recorded_at' => now()->toIso8601String(),
        ];

        $project->forceFill(['stage_data' => $existing])->save();

        return new ProjectResource(
            $project->fresh(['projectManager', 'salesRep', 'latestBom.lines'])
        );
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    protected function normalizeSpatialMeasurementItems(array $items, int $projectId): array
    {
        return collect($items)
            ->map(function (array $item) use ($projectId) {
                $normalized = $this->normalizeMeasurementItems([$item])[0];
                $shape = $item['shape'] ?? 'rectangle';

                if (! in_array($shape, self::SITE_ASSESSMENT_SHAPES, true)) {
                    $shape = 'rectangle';
                }

                $sideMeasurements = collect($item['side_measurements_ft'] ?? [])
                    ->filter(fn ($value) => $value !== null && $value !== '')
                    ->map(fn ($value) => round((float) $value, 2))
                    ->values()
                    ->all();

                return [
                    ...$normalized,
                    'shape' => $shape,
                    'dimensions_description' => trim((string) ($item['dimensions_description'] ?? '')) ?: null,
                    'side_measurements_ft' => $sideMeasurements !== [] ? $sideMeasurements : null,
                    'images' => $this->normalizeAssessmentImages($item['images'] ?? [], $projectId),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $images
     * @return list<array<string, mixed>>
     */
    protected function normalizeAssessmentImages(array $images, int $projectId): array
    {
        $expectedPrefix = "private/site-assessment/project-{$projectId}/";

        return collect($images)
            ->map(function (array $image) use ($expectedPrefix) {
                $path = ltrim(str_replace('\\', '/', (string) ($image['path'] ?? '')), '/');

                if ($path === '' || ! str_starts_with($path, $expectedPrefix)) {
                    return null;
                }

                return [
                    'path' => $path,
                    'url' => BiboStorage::resolveStoredUrl($path),
                    'original_name' => trim((string) ($image['original_name'] ?? basename($path))),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    protected function normalizeMeasurementItems(array $items): array
    {
        return collect($items)
            ->map(function (array $item) {
                $widthFt = $this->measurementDimensionInFeet($item, 'width');
                $heightFt = $this->measurementDimensionInFeet($item, 'height');

                return [
                    'label' => trim((string) ($item['label'] ?? '')),
                    'width_ft' => $widthFt,
                    'height_ft' => $heightFt,
                    'notes' => trim((string) ($item['notes'] ?? '')) ?: null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $item
     */
    protected function measurementDimensionInFeet(array $item, string $dimension): ?float
    {
        $ftKey = "{$dimension}_ft";
        $mmKey = "{$dimension}_mm";

        if (isset($item[$ftKey]) && $item[$ftKey] !== '') {
            return (float) $item[$ftKey];
        }

        if (isset($item[$mmKey]) && $item[$mmKey] !== '') {
            return round(((float) $item[$mmKey]) / 304.8, 2);
        }

        return null;
    }

    public function advanceStage(Request $request, Project $project): ProjectResource
    {
        $this->authorize('advanceStage', $project);

        $validated = $request->validate([
            'stage' => ['required', 'string'],
            'reason' => ['nullable', 'string'],
            'force' => ['sometimes', 'boolean'],
            'deposit_confirmation' => ['sometimes', 'array'],
            'deposit_confirmation.notes' => ['required_with:deposit_confirmation', 'string'],
            'deposit_confirmation.confirmed_at' => ['nullable', 'date'],
            'site_assessment' => ['sometimes', 'array'],
            'site_assessment.doors_count' => ['nullable', 'integer', 'min:0'],
            'site_assessment.windows_count' => ['nullable', 'integer', 'min:0'],
            'site_assessment.rooms_count' => ['nullable', 'integer', 'min:0'],
            'site_assessment.floors_count' => ['nullable', 'integer', 'min:0'],
            'site_assessment.measurements' => ['nullable', 'string'],
            'site_assessment.findings_notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $fromStage = $this->stages->currentStage($project);
        $target = ProjectStage::from($validated['stage']);
        $force = (bool) ($validated['force'] ?? false) && $user->can('projects.view_all');

        $this->assertUserCanAdvanceToStage($user, $project, $fromStage, $target);

        $stageData = $this->buildStageDataPayload(
            $user,
            $fromStage,
            $target,
            $validated,
        );

        $this->validateStageRequirements($project, $fromStage, $target, $validated);

        $project = $this->stages->transition($project, $target, $user, [
            'reason' => $validated['reason'] ?? null,
            'force' => $force,
            'stage_data' => $stageData,
        ]);

        return new ProjectResource(
            $project->load(['projectManager', 'salesRep', 'latestBom.lines'])
        );
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function buildStageDataPayload(
        User $user,
        ProjectStage $fromStage,
        ProjectStage $target,
        array $validated,
    ): array {
        $stageData = [];
        $recordedMeta = [
            'recorded_by' => $user->id,
            'recorded_at' => now()->toIso8601String(),
        ];

        if ($target === ProjectStage::DepositReceived && isset($validated['deposit_confirmation'])) {
            $stageData['deposit_received'] = [
                ...$validated['deposit_confirmation'],
                ...$recordedMeta,
            ];
        }

        return $stageData;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    protected function validateStageRequirements(
        Project $project,
        ProjectStage $fromStage,
        ProjectStage $target,
        array $validated,
    ): void {
        if ($fromStage === ProjectStage::AwaitingDeposit && $target === ProjectStage::DepositReceived) {
            $notes = trim((string) ($validated['deposit_confirmation']['notes'] ?? ''));

            if ($notes === '') {
                throw ValidationException::withMessages([
                    'deposit_confirmation.notes' => ['Deposit confirmation notes are required.'],
                ]);
            }
        }

        if ($fromStage === ProjectStage::SiteAssessment && $target === ProjectStage::FinalDesignApproval) {
            $stageData = is_array($project->stage_data) ? $project->stage_data : [];

            if (! SiteAssessmentData::hasProductionMeasurement($stageData)) {
                throw ValidationException::withMessages([
                    'site_measurement' => [
                        'Complete and approve a production measurement visit before advancing.',
                    ],
                ]);
            }
        }

        if ($fromStage === ProjectStage::FinalDesignApproval && $target === ProjectStage::BomFinalized) {
            if (! ProjectStageGate::hasDesignDocument($project)) {
                throw ValidationException::withMessages([
                    'documents' => [
                        'Upload at least one design document on the Designs tab before advancing.',
                    ],
                ]);
            }

            if (! ProjectStageGate::hasBomFinalized($project)) {
                throw ValidationException::withMessages([
                    'bom' => [
                        'Upload and finalize the BOM on the BOM tab before advancing.',
                    ],
                ]);
            }
        }
    }

    protected function assertUserCanAdvanceToStage(
        User $user,
        Project $project,
        ProjectStage $fromStage,
        ProjectStage $target,
    ): void {
        if ($user->can('projects.manage') || $user->can('projects.view_all')) {
            return;
        }

        if (
            $user->can('projects.advance_stage_sales')
            && (int) $project->sales_rep_id === $user->id
            && $this->stages->isSalesAdvanceTransition($fromStage, $target)
        ) {
            return;
        }

        if (ProjectStageAdvance::userCanAdvanceTo($user, $fromStage, $target)) {
            return;
        }

        abort(403, 'You are not allowed to advance this project to the requested stage.');
    }

    public function dashboard(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()->visibleTo($request->user());

        return response()->json([
            'data' => $this->dashboard->summaryForVisibleProjects($query),
        ]);
    }

    public function pipeline(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()->visibleTo($request->user());

        return response()->json([
            'data' => $this->dashboard->pipelineForVisibleProjects($query),
        ]);
    }

    public function timeline(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['stageLogs', 'delays.logger']);

        return response()->json([
            'data' => [
                'project_id' => $project->id,
                'projected_start' => $project->projected_start?->toDateString(),
                'projected_end' => $project->projected_end?->toDateString(),
                'actual_start' => $project->actual_start?->toDateString(),
                'actual_end' => $project->actual_end?->toDateString(),
                'stage_logs' => $project->stageLogs
                    ->sortBy('changed_at')
                    ->values()
                    ->map(fn ($log) => [
                        'id' => $log->id,
                        'from_stage' => $log->from_stage,
                        'to_stage' => $log->to_stage,
                        'delay_reason' => $log->delay_reason,
                        'changed_by' => $log->changed_by,
                        'changed_at' => $log->changed_at?->toIso8601String(),
                    ]),
                'delays' => $project->delays->map(fn (ProjectDelay $delay) => [
                    'id' => $delay->id,
                    'stage' => $delay->stage,
                    'reason' => $delay->reason,
                    'days_lost' => $delay->days_lost,
                    'notes' => $delay->notes,
                    'logged_at' => $delay->logged_at?->toIso8601String(),
                    'logged_by' => $delay->logger?->name,
                ]),
            ],
        ]);
    }

    protected function applyBucketFilter($query, string $bucket): void
    {
        $queuedStages = [
            ProjectStage::AwaitingDeposit->value,
            ProjectStage::DepositReceived->value,
            ProjectStage::SiteAssessment->value,
            ProjectStage::FinalDesignApproval->value,
            ProjectStage::BomFinalized->value,
            ProjectStage::MaterialCheck->value,
            ProjectStage::MaterialsReserved->value,
        ];

        $startedStages = [
            ProjectStage::MaterialsReady->value,
            ProjectStage::MaterialsReleased->value,
            ProjectStage::CuttingStage->value,
            ProjectStage::FabricationStage->value,
            ProjectStage::GlassAssembly->value,
            ProjectStage::QcPreInstallation->value,
            ProjectStage::InTransit->value,
            ProjectStage::Installation->value,
            ProjectStage::SiteQc->value,
            ProjectStage::Snagging->value,
        ];

        match ($bucket) {
            'queued' => $query->whereIn('stage', $queuedStages),
            'awaiting_procurement' => $query->where('stage', ProjectStage::AwaitingProcurement->value),
            'started' => $query->whereIn('stage', $startedStages),
            'completed' => $query->where('stage', ProjectStage::ProjectComplete->value),
            default => null,
        };
    }
}
