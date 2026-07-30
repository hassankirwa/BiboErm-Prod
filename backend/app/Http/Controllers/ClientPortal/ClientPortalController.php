<?php

namespace App\Http\Controllers\ClientPortal;

use App\Enums\FieldInstallation\FieldPhotoAttachableType;
use App\Enums\ProjectStage;
use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Http\Controllers\Controller;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationPhoto;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\ProjectDocument;
use App\Models\QualityControl\QcInspection;
use App\Models\QualityControl\QcInspectionPhoto;
use App\Models\SiteVisit;
use App\Models\SiteVisitPhoto;
use App\Support\BiboStorage;
use App\Support\ProjectStageLabels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClientPortalController extends Controller
{
    private const TOKEN_TTL_MINUTES = 60 * 24 * 14;

    /** @var list<string> */
    private const CLIENT_VISIBLE_DOCUMENT_TYPES = [
        'quotation',
        'proforma',
        'contract',
        'approved_design',
        'final_design',
        'handover',
        'warranty',
        'completion_certificate',
    ];

    /**
     * High-level journey shown to clients (maps many PM stages → few steps).
     *
     * @var list<array{key: string, label: string, description: string, stages: list<string>}>
     */
    private const CLIENT_JOURNEY = [
        [
            'key' => 'design',
            'label' => 'Design',
            'description' => 'Deposit, site visit, and design approval',
            'stages' => [
                ProjectStage::AwaitingDeposit->value,
                ProjectStage::DepositReceived->value,
                ProjectStage::SiteAssessment->value,
                ProjectStage::FinalDesignApproval->value,
            ],
        ],
        [
            'key' => 'production',
            'label' => 'Production',
            'description' => 'Materials, fabrication, and factory quality checks',
            'stages' => [
                ProjectStage::BomFinalized->value,
                ProjectStage::MaterialCheck->value,
                ProjectStage::MaterialsReserved->value,
                ProjectStage::AwaitingProcurement->value,
                ProjectStage::MaterialsReady->value,
                ProjectStage::MaterialsReleased->value,
                ProjectStage::CuttingStage->value,
                ProjectStage::FabricationStage->value,
                ProjectStage::GlassAssembly->value,
                ProjectStage::QcPreInstallation->value,
            ],
        ],
        [
            'key' => 'installation',
            'label' => 'Installation',
            'description' => 'Delivery, on-site fitting, and site quality checks',
            'stages' => [
                ProjectStage::InTransit->value,
                ProjectStage::Installation->value,
                ProjectStage::SiteQc->value,
                ProjectStage::Snagging->value,
            ],
        ],
        [
            'key' => 'complete',
            'label' => 'Complete',
            'description' => 'Handover and project close-out',
            'stages' => [
                ProjectStage::ProjectComplete->value,
            ],
        ],
    ];

    /** @var list<string> */
    private const CLIENT_QC_CONTEXTS = [
        QcInspectionContext::ProductionQcPostFabrication->value,
        QcInspectionContext::SiteInstallation->value,
        QcInspectionContext::SnaggingSignoff->value,
    ];

    /** @var list<string> */
    private const CLIENT_FIELD_PHOTO_TYPES = [
        FieldPhotoAttachableType::General->value,
        FieldPhotoAttachableType::DailyLog->value,
        FieldPhotoAttachableType::UnitProgress->value,
        FieldPhotoAttachableType::Delivery->value,
    ];

    public function access(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'string', 'max:50'],
        ]);

        $project = $this->findProject($validated['identifier']);

        if (! $project || ! $this->phoneOwnsProject($project, $validated['phone'])) {
            throw ValidationException::withMessages([
                'identifier' => ['We could not match that project and phone number.'],
            ]);
        }

        $project->load(['contact', 'account']);

        return response()->json([
            'data' => [
                'access_token' => $this->issueToken($project),
                'expires_at' => now()->addMinutes(self::TOKEN_TTL_MINUTES)->toIso8601String(),
                'project' => $this->clientProjectSummary($project),
            ],
        ]);
    }

    public function progress(Request $request, Project $project): JsonResponse
    {
        $this->assertTokenForProject($request, $project);
        $token = $this->tokenFromRequest($request);

        $project->load([
            'contact',
            'account',
            'projectManager:id,name,email',
            'stageLogs',
            'delays',
            'documents',
            'siteVisits.photos',
            'fieldInstallationJobs.units',
            'fieldInstallationJobs.dailyLogs',
            'fieldInstallationJobs.photos',
        ]);

        $productionOrders = ProductionOrder::query()
            ->where('project_id', $project->id)
            ->latest()
            ->get();

        $qcInspections = QcInspection::query()
            ->where('project_id', $project->id)
            ->whereIn('context', self::CLIENT_QC_CONTEXTS)
            ->whereIn('result', [
                QcInspectionResult::Pass->value,
                QcInspectionResult::ConditionalPass->value,
            ])
            ->with(['photos' => fn ($q) => $q->whereNull('defect_id')])
            ->latest()
            ->limit(10)
            ->get();

        $gallery = $this->buildGallery($project, $token, $qcInspections);

        return response()->json([
            'data' => [
                'project' => $this->clientProjectSummary($project),
                'journey' => $this->journey($project),
                'milestones' => $this->milestones($project),
                'timeline' => $project->stageLogs
                    ->sortByDesc('changed_at')
                    ->values()
                    ->take(12)
                    ->map(fn ($log) => [
                        'id' => $log->id,
                        'from_stage' => $log->from_stage instanceof ProjectStage
                            ? $log->from_stage->value
                            : $log->from_stage,
                        'from_stage_label' => $log->from_stage ? ProjectStageLabels::for($log->from_stage) : null,
                        'to_stage' => $log->to_stage instanceof ProjectStage
                            ? $log->to_stage->value
                            : $log->to_stage,
                        'to_stage_label' => ProjectStageLabels::for($log->to_stage),
                        'changed_at' => $log->changed_at?->toIso8601String(),
                    ]),
                'production' => $productionOrders->map(fn (ProductionOrder $order) => [
                    'id' => $order->id,
                    'reference' => $order->reference,
                    'status' => $order->status?->value ?? $order->status,
                    'current_stage' => $order->current_stage?->value ?? $order->current_stage,
                    'current_stage_label' => $order->current_stage?->label(),
                    'scheduled_start' => $order->scheduled_start?->toDateString(),
                    'scheduled_end' => $order->scheduled_end?->toDateString(),
                    'actual_start' => $order->actual_start?->toDateString(),
                    'actual_end' => $order->actual_end?->toDateString(),
                ]),
                'qc' => $qcInspections->map(fn (QcInspection $inspection) => [
                    'id' => $inspection->id,
                    'reference' => $inspection->reference,
                    'context' => $inspection->context?->value ?? $inspection->context,
                    'result' => $inspection->result?->value ?? $inspection->result,
                    'inspected_at' => $inspection->inspected_at?->toIso8601String(),
                    'completed_at' => $inspection->completed_at?->toIso8601String(),
                ]),
                'installation' => $project->fieldInstallationJobs->map(fn (FieldInstallationJob $job) => [
                    'id' => $job->id,
                    'reference' => $job->reference,
                    'job_type' => $job->job_type?->value ?? $job->job_type,
                    'status' => $job->status?->value ?? $job->status,
                    'percent_complete' => $job->percent_complete,
                    'scheduled_start' => $job->scheduled_start?->toDateString(),
                    'scheduled_end' => $job->scheduled_end?->toDateString(),
                    'actual_start' => $job->actual_start?->toIso8601String(),
                    'actual_end' => $job->actual_end?->toIso8601String(),
                    'units' => $job->units->map(fn ($unit) => [
                        'id' => $unit->id,
                        'label' => $unit->unit_label,
                        'status' => $unit->status?->value ?? $unit->status,
                        'installed_at' => $unit->installed_at?->toIso8601String(),
                    ]),
                    'latest_logs' => $job->dailyLogs
                        ->sortByDesc('log_date')
                        ->take(8)
                        ->values()
                        ->map(fn ($log) => [
                            'id' => $log->id,
                            'log_date' => $log->log_date?->toDateString(),
                            'summary' => $log->summary,
                            'units_completed' => $log->units_completed,
                        ]),
                ]),
                'gallery' => $gallery,
                'documents' => $project->documents
                    ->filter(fn (ProjectDocument $document) => in_array($document->type, self::CLIENT_VISIBLE_DOCUMENT_TYPES, true))
                    ->values()
                    ->map(fn (ProjectDocument $document) => [
                        'id' => $document->id,
                        'type' => $document->type,
                        'filename' => $document->filename,
                        'version' => $document->version,
                        'url' => url("/api/v1/client-portal/projects/{$project->id}/documents/{$document->id}?token=".rawurlencode($token)),
                        'created_at' => $document->created_at?->toIso8601String(),
                    ]),
                'delays' => $project->delays->map(fn ($delay) => [
                    'id' => $delay->id,
                    'stage' => $delay->stage instanceof ProjectStage ? $delay->stage->value : $delay->stage,
                    'stage_label' => ProjectStageLabels::for($delay->stage),
                    'reason' => $delay->reason,
                    'days_lost' => $delay->days_lost,
                    'logged_at' => $delay->logged_at?->toIso8601String(),
                ]),
            ],
        ]);
    }

    public function document(Request $request, Project $project, ProjectDocument $document): StreamedResponse|Response
    {
        $this->assertTokenForProject($request, $project);

        if ((int) $document->project_id !== $project->id
            || ! in_array($document->type, self::CLIENT_VISIBLE_DOCUMENT_TYPES, true)
        ) {
            abort(404);
        }

        return $this->streamPrivatePath($document->path, $document->filename);
    }

    public function media(Request $request, Project $project, string $mediaKey): StreamedResponse|Response
    {
        $this->assertTokenForProject($request, $project);

        [$source, $id] = array_pad(explode('-', $mediaKey, 2), 2, null);
        if (! $source || $id === null || $id === '') {
            abort(404);
        }

        $resolved = match ($source) {
            'field' => $this->resolveFieldPhoto($project, (int) $id),
            'visit' => $this->resolveVisitPhoto($project, (int) $id),
            'qc' => $this->resolveQcPhoto($project, (int) $id),
            'assess' => $this->resolveAssessmentPhoto($project, $id),
            'sketch' => $this->resolveSketchPhoto($project, (int) $id),
            default => null,
        };

        if ($resolved === null) {
            abort(404);
        }

        if (! empty($resolved['firebase_url'])) {
            return redirect()->away($resolved['firebase_url']);
        }

        return $this->streamPrivatePath($resolved['path'], $resolved['filename'] ?? basename($resolved['path']));
    }

    private function findProject(string $identifier): ?Project
    {
        $identifier = trim($identifier);

        return Project::query()
            ->with(['contact', 'account', 'fieldInstallationJobs'])
            ->where(function ($query) use ($identifier) {
                $query
                    ->where('reference', $identifier)
                    ->orWhere('client_portal_code', $identifier);

                if (ctype_digit($identifier)) {
                    $query->orWhereKey((int) $identifier);
                }
            })
            ->first();
    }

    private function phoneOwnsProject(Project $project, string $phone): bool
    {
        $needle = $this->normalizePhone($phone);

        if ($needle === '') {
            return false;
        }

        $phones = [
            $project->contact?->phone,
            $project->account?->phone,
            $project->account?->company_phone ?? null,
            ...$project->fieldInstallationJobs->pluck('site_contact_phone')->all(),
        ];

        foreach ($phones as $candidate) {
            $normalized = $this->normalizePhone((string) $candidate);
            if ($normalized !== '' && (Str::endsWith($normalized, $needle) || Str::endsWith($needle, $normalized))) {
                return true;
            }
        }

        return false;
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? '';
    }

    /**
     * @return array<string, mixed>
     */
    private function clientProjectSummary(Project $project): array
    {
        return [
            'id' => $project->id,
            'reference' => $project->reference,
            'client_portal_code' => $project->client_portal_code,
            'name' => $project->name,
            'stage' => $project->stage?->value ?? $project->stage,
            'stage_label' => ProjectStageLabels::for($project->stage?->value ?? $project->stage),
            'completion_percent' => $project->completion_percent,
            'site_address' => $project->site_address,
            'projected_start' => $project->projected_start?->toDateString(),
            'projected_end' => $project->projected_end?->toDateString(),
            'actual_start' => $project->actual_start?->toDateString(),
            'actual_end' => $project->actual_end?->toDateString(),
            'project_manager' => $project->projectManager ? [
                'name' => $project->projectManager->name,
                'email' => $project->projectManager->email,
            ] : null,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function journey(Project $project): array
    {
        $current = $project->stage instanceof ProjectStage
            ? $project->stage
            : ProjectStage::tryFrom((string) $project->stage);

        $currentStepIndex = 0;
        if ($current) {
            foreach (self::CLIENT_JOURNEY as $index => $step) {
                if (in_array($current->value, $step['stages'], true)) {
                    $currentStepIndex = $index;
                    break;
                }
            }
        }

        return collect(self::CLIENT_JOURNEY)->map(function (array $step, int $index) use ($currentStepIndex) {
            $state = 'upcoming';
            if ($index < $currentStepIndex) {
                $state = 'complete';
            } elseif ($index === $currentStepIndex) {
                $state = 'current';
            }

            return [
                'key' => $step['key'],
                'number' => $index + 1,
                'label' => $step['label'],
                'description' => $step['description'],
                'state' => $state,
            ];
        })->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function milestones(Project $project): array
    {
        $stages = array_values(ProjectStage::cases());
        $current = $project->stage instanceof ProjectStage ? $project->stage : ProjectStage::tryFrom((string) $project->stage);
        $currentIndex = $current ? array_search($current, $stages, true) : false;

        return collect($stages)->map(function (ProjectStage $stage, int $index) use ($currentIndex, $current) {
            $state = 'upcoming';
            if ($currentIndex !== false && $index < $currentIndex) {
                $state = 'complete';
            } elseif ($current && $stage === $current) {
                $state = 'current';
            }

            return [
                'stage' => $stage->value,
                'label' => ProjectStageLabels::for($stage),
                'state' => $state,
            ];
        })->all();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, QcInspection>  $qcInspections
     * @return list<array<string, mixed>>
     */
    private function buildGallery(Project $project, string $token, $qcInspections): array
    {
        $items = [];

        foreach ($project->siteVisits as $visit) {
            /** @var SiteVisit $visit */
            if ($visit->rough_sketch_path) {
                $items[] = $this->galleryItem(
                    project: $project,
                    token: $token,
                    key: 'sketch-'.$visit->id,
                    source: 'site_visit',
                    step: 'design',
                    caption: 'Site measurement sketch',
                    takenAt: $visit->approved_at?->toIso8601String() ?? $visit->submitted_at?->toIso8601String(),
                    firebaseUrl: null,
                    path: $visit->rough_sketch_path,
                );
            }

            foreach ($visit->photos as $photo) {
                /** @var SiteVisitPhoto $photo */
                $items[] = $this->galleryItem(
                    project: $project,
                    token: $token,
                    key: 'visit-'.$photo->id,
                    source: 'site_visit',
                    step: 'design',
                    caption: 'Site visit photo',
                    takenAt: $photo->created_at?->toIso8601String(),
                    firebaseUrl: $photo->firebase_url,
                    path: $photo->file_path,
                );
            }
        }

        foreach ($this->assessmentImagePaths($project) as $hash => $meta) {
            $items[] = $this->galleryItem(
                project: $project,
                token: $token,
                key: 'assess-'.$hash,
                source: 'site_assessment',
                step: 'design',
                caption: $meta['caption'],
                takenAt: null,
                firebaseUrl: null,
                path: $meta['path'],
            );
        }

        foreach ($qcInspections as $inspection) {
            foreach ($inspection->photos as $photo) {
                /** @var QcInspectionPhoto $photo */
                $context = $inspection->context?->value ?? (string) $inspection->context;
                $step = match ($context) {
                    QcInspectionContext::SiteInstallation->value,
                    QcInspectionContext::SnaggingSignoff->value => 'installation',
                    default => 'production',
                };

                $items[] = $this->galleryItem(
                    project: $project,
                    token: $token,
                    key: 'qc-'.$photo->id,
                    source: 'qc',
                    step: $step,
                    caption: $photo->caption ?: 'Quality check photo',
                    takenAt: $photo->created_at?->toIso8601String(),
                    firebaseUrl: $photo->firebase_url,
                    path: $photo->file_path,
                );
            }
        }

        foreach ($project->fieldInstallationJobs as $job) {
            foreach ($job->photos as $photo) {
                /** @var FieldInstallationPhoto $photo */
                $type = $photo->attachable_type?->value ?? (string) $photo->attachable_type;
                if (! in_array($type, self::CLIENT_FIELD_PHOTO_TYPES, true)) {
                    continue;
                }

                $items[] = $this->galleryItem(
                    project: $project,
                    token: $token,
                    key: 'field-'.$photo->id,
                    source: 'field_installation',
                    step: 'installation',
                    caption: $photo->caption ?: 'Installation progress',
                    takenAt: $photo->taken_at?->toIso8601String() ?? $photo->created_at?->toIso8601String(),
                    firebaseUrl: $photo->firebase_url,
                    path: $photo->file_path,
                );
            }
        }

        usort($items, function (array $a, array $b): int {
            return strcmp((string) ($b['taken_at'] ?? ''), (string) ($a['taken_at'] ?? ''));
        });

        return array_values($items);
    }

    /**
     * @return array<string, mixed>
     */
    private function galleryItem(
        Project $project,
        string $token,
        string $key,
        string $source,
        string $step,
        ?string $caption,
        ?string $takenAt,
        ?string $firebaseUrl,
        ?string $path,
    ): array {
        $url = $firebaseUrl
            ?: url("/api/v1/client-portal/projects/{$project->id}/media/{$key}?token=".rawurlencode($token));

        return [
            'id' => $key,
            'source' => $source,
            'step' => $step,
            'caption' => $caption,
            'taken_at' => $takenAt,
            'url' => $url,
            'has_file' => filled($firebaseUrl) || filled($path),
        ];
    }

    /**
     * @return array<string, array{path: string, caption: string}>
     */
    private function assessmentImagePaths(Project $project): array
    {
        $assessment = data_get($project->stage_data, 'site_assessment');
        if (! is_array($assessment)) {
            return [];
        }

        $out = [];

        $push = function (?string $path, string $caption) use (&$out): void {
            $path = ltrim(str_replace('\\', '/', (string) $path), '/');
            if ($path === '' || str_contains($path, '..')) {
                return;
            }
            $hash = substr(hash('sha256', $path), 0, 16);
            $out[$hash] = ['path' => $path, 'caption' => $caption];
        };

        foreach (($assessment['additional_images'] ?? []) as $image) {
            if (is_array($image)) {
                $push($image['path'] ?? null, (string) ($image['original_name'] ?? 'Site assessment photo'));
            }
        }

        foreach (['balconies', 'bathrooms'] as $group) {
            foreach (($assessment[$group] ?? []) as $item) {
                if (! is_array($item)) {
                    continue;
                }
                foreach (($item['images'] ?? []) as $image) {
                    if (is_array($image)) {
                        $push($image['path'] ?? null, (string) ($image['original_name'] ?? ucfirst(rtrim($group, 's')).' photo'));
                    }
                }
            }
        }

        return $out;
    }

    /**
     * @return array{path: string, filename?: string, firebase_url?: string|null}|null
     */
    private function resolveFieldPhoto(Project $project, int $id): ?array
    {
        $photo = FieldInstallationPhoto::query()
            ->whereKey($id)
            ->whereHas('job', fn ($q) => $q->where('project_id', $project->id))
            ->first();

        if (! $photo) {
            return null;
        }

        $type = $photo->attachable_type?->value ?? (string) $photo->attachable_type;
        if (! in_array($type, self::CLIENT_FIELD_PHOTO_TYPES, true)) {
            return null;
        }

        return [
            'path' => (string) $photo->file_path,
            'firebase_url' => $photo->firebase_url,
            'filename' => basename((string) $photo->file_path) ?: 'installation-photo.jpg',
        ];
    }

    /**
     * @return array{path: string, filename?: string, firebase_url?: string|null}|null
     */
    private function resolveVisitPhoto(Project $project, int $id): ?array
    {
        $photo = SiteVisitPhoto::query()
            ->whereKey($id)
            ->whereHas('siteVisit', fn ($q) => $q->where('project_id', $project->id))
            ->first();

        if (! $photo) {
            return null;
        }

        return [
            'path' => (string) $photo->file_path,
            'firebase_url' => $photo->firebase_url,
            'filename' => basename((string) $photo->file_path) ?: 'site-visit-photo.jpg',
        ];
    }

    /**
     * @return array{path: string, filename?: string, firebase_url?: string|null}|null
     */
    private function resolveQcPhoto(Project $project, int $id): ?array
    {
        $photo = QcInspectionPhoto::query()
            ->whereKey($id)
            ->whereNull('defect_id')
            ->whereHas('inspection', function ($q) use ($project) {
                $q->where('project_id', $project->id)
                    ->whereIn('context', self::CLIENT_QC_CONTEXTS)
                    ->whereIn('result', [
                        QcInspectionResult::Pass->value,
                        QcInspectionResult::ConditionalPass->value,
                    ]);
            })
            ->first();

        if (! $photo) {
            return null;
        }

        return [
            'path' => (string) $photo->file_path,
            'firebase_url' => $photo->firebase_url,
            'filename' => basename((string) $photo->file_path) ?: 'qc-photo.jpg',
        ];
    }

    /**
     * @return array{path: string, filename?: string, firebase_url?: string|null}|null
     */
    private function resolveAssessmentPhoto(Project $project, string $hash): ?array
    {
        $paths = $this->assessmentImagePaths($project);
        if (! isset($paths[$hash])) {
            return null;
        }

        return [
            'path' => $paths[$hash]['path'],
            'filename' => basename($paths[$hash]['path']) ?: 'assessment-photo.jpg',
        ];
    }

    /**
     * @return array{path: string, filename?: string, firebase_url?: string|null}|null
     */
    private function resolveSketchPhoto(Project $project, int $visitId): ?array
    {
        $visit = SiteVisit::query()
            ->whereKey($visitId)
            ->where('project_id', $project->id)
            ->first();

        if (! $visit || ! $visit->rough_sketch_path) {
            return null;
        }

        return [
            'path' => (string) $visit->rough_sketch_path,
            'filename' => basename((string) $visit->rough_sketch_path) ?: 'site-sketch.jpg',
        ];
    }

    private function streamPrivatePath(string $path, string $filename): StreamedResponse|Response
    {
        $parsed = BiboStorage::parseStoredPath($path);
        if ($parsed === null || $parsed['visibility'] !== 'private') {
            abort(404);
        }

        $disk = Storage::disk(BiboStorage::diskName());
        if (! $disk->exists($path)) {
            abort(404);
        }

        $mime = $disk->mimeType($path) ?: 'application/octet-stream';

        return response()->stream(function () use ($disk, $path): void {
            $stream = $disk->readStream($path);
            if (! is_resource($stream)) {
                return;
            }

            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.basename($filename).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    private function issueToken(Project $project): string
    {
        $payload = [
            'project_id' => $project->id,
            'exp' => now()->addMinutes(self::TOKEN_TTL_MINUTES)->timestamp,
            'nonce' => Str::random(12),
        ];

        $encoded = rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $encoded, $this->signingKey());

        return $encoded.'.'.$signature;
    }

    private function assertTokenForProject(Request $request, Project $project): void
    {
        $token = $this->tokenFromRequest($request);
        [$encoded, $signature] = array_pad(explode('.', $token, 2), 2, null);

        if (! $encoded || ! $signature || ! hash_equals(hash_hmac('sha256', $encoded, $this->signingKey()), $signature)) {
            abort(401, 'Invalid client portal token.');
        }

        $base64 = strtr($encoded, '-_', '+/');
        $base64 .= str_repeat('=', (4 - strlen($base64) % 4) % 4);
        $payload = json_decode(base64_decode($base64) ?: '{}', true);

        if (! is_array($payload)
            || (int) ($payload['project_id'] ?? 0) !== $project->id
            || Carbon::createFromTimestamp((int) ($payload['exp'] ?? 0))->isPast()
        ) {
            abort(401, 'Client portal token expired or does not match this project.');
        }
    }

    private function tokenFromRequest(Request $request): string
    {
        $headerToken = Str::after((string) $request->header('Authorization'), 'Bearer ');

        return $headerToken !== '' ? $headerToken : (string) $request->query('token', '');
    }

    private function signingKey(): string
    {
        return (string) Config::get('app.key', 'bibo-client-portal');
    }
}
